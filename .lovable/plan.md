## Goal
Make the Inquiries → Accept → Pay → Orders flow reliable end-to-end. Today, on a quoted inquiry, the detail page sometimes doesn't render the quote block / Accept button, so the customer is stuck.

## Changes

### 1. `src/routes/_authenticated.account.inquiries.$id.tsx` — rebuild states
Render one of four clearly-defined states based on `status`, so the quoted card and Accept button always show when applicable:

- `new` / `contacted` — "Awaiting quote from our team".
- `quoted` — Always render the "Final quote" card with `final_price_usd ?? total_usd` (fallback so the card never disappears if price is null), plus **Accept Quote** and **Decline** buttons.
- `accepted` / `pending_payment` — Show a prominent **Pay Now** card linking to `/checkout/pay/$id`.
- `cancelled` — Show decline reason.
- Paid/fulfilment statuses — Show "Payment received" with a link to `/account/orders/$id`.

Also: on Accept success, auto-navigate straight to `/checkout/pay/$id` (instead of just updating the panel) so the customer never has to hunt for the next button.

### 2. `src/routes/_authenticated.account.inquiries.tsx` — list buttons
- For `status = 'quoted'` → keep **Review Quote** → `/account/inquiries/$id`.
- For `status = 'accepted'` or `'pending_payment'` → **Pay Now** → `/checkout/pay/$id`.
- For all other statuses → **Details** → `/account/inquiries/$id`.
- Never render both Review Quote and Details for the same row.

### 3. `src/routes/_authenticated.checkout.pay.$id.tsx` — post-payment redirect
Already redirects to `/account/orders/$id` after payment. Add these query invalidations before navigating so the Orders page & sidebar counts are fresh:
- `["account-orders"]`, `["account-inquiries"]`, `["order", id]`, `["inquiry", id]`, `["account-dashboard"]`.

### 4. `src/lib/account/orders.functions.ts` — ensure paid quotation shows in Orders
`getMyOrders` currently filters quotations by `status.in.(pending_payment, paid, processing, shipped, in_transit, delivered, closed)`. Keep as-is — verified `completeDummyPayment` sets `status = 'paid'`, so the paid quotation will appear. No change needed; only verify by testing.

### 5. `src/lib/account/quotes.functions.ts` — small safety
`acceptQuote` currently returns `{ ok: true }`. Keep, but ensure it never throws when the row is already `accepted` (idempotent) so a double-click doesn't produce a confusing error.

## Verification steps
1. As a customer with a `quoted` inquiry: open Inquiries → click **Review Quote** → confirm the quote card + Accept button render.
2. Click **Accept Quote** → confirm auto-redirect to Razorpay-style payment page.
3. Click **Pay** → confirm success toast and redirect to `/account/orders/$id`.
4. Open **Account → Orders** list → confirm the newly paid order appears.
5. Open **Account → Inquiries** list → confirm the paid one no longer appears (status moved to `paid`).

## Out of scope
- Admin panel behavior (unchanged).
- Real payment integration (still dummy Razorpay).
- WhatsApp anything (already removed).