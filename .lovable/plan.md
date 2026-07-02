## Problem

Both **Instant Checkout** and **Request a Quote** fail with:

> `new row violates row-level security policy for table "order_status_history"`

### Root cause

Every insert / status change on `quote_requests` fires the trigger `log_quote_status_change`, which inserts a row into `public.order_status_history`. The trigger runs as the *calling* user (not `SECURITY DEFINER`), and `order_status_history` only has two policies:

- Admins can do everything (`INSERT`/`UPDATE`/`DELETE`/`SELECT`)
- Owners can `SELECT` their own history

There is **no INSERT policy for regular users**, so as soon as a signed-in customer creates an instant order or a quote request, the trigger insert is blocked by RLS and the whole transaction is rolled back — which is why the checkout button and the WhatsApp quote button both appear to "do nothing" (they toast the RLS error and never open WhatsApp / never place the order).

## Fix

Migration that flips the trigger function to `SECURITY DEFINER` (with a locked `search_path`) so the audit insert bypasses RLS on `order_status_history` while user-facing reads stay restricted by the existing "users view own status history" policy.

```sql
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, COALESCE(auth.uid(), NEW.user_id));
  END IF;
  RETURN NEW;
END $$;
```

## Scope

- Single migration on the trigger function only. No table/policy/code changes required.
- The other reported symptoms (buttons doing nothing, WhatsApp not opening) are downstream effects of this same RLS failure and will resolve with this fix. Redirect-after-login already preserves the cart (cart lives in `localStorage`, sign-in respects the `?redirect=/cart` param).
- WhatsApp number and message templates are correct; no change needed.

## Verification

After migration:

1. Signed-in user with cart total < $1000 → **Place Order (Instant)** → order lands in `quote_requests` with `order_type='instant'`, `status='pending_payment'`, and a history row is created.
2. Signed-in user → **Request a Quote** → quote is saved and WhatsApp opens with the prefilled message.
3. Admin status changes on quotes/orders continue to log history correctly.