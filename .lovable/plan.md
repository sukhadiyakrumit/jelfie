## Goal
Make the Inquiries → Review Quote → Payment flow reliable and self-contained on the inquiry detail page.

## Problems observed
1. On `/account/inquiries`, both "Review Quote" and "Details" buttons point to the same route (`/account/inquiries/$id`), which is confusing and looks broken (two buttons, same result).
2. After accepting a quote, the customer is auto-navigated away to a separate `/pay` screen. If the redirect misfires (or the query cache is stale), the "Pay Now" affordance appears to "not work".
3. There is no single, obvious pay CTA on the Review Quote screen itself after acceptance.

## Changes

### `src/routes/_authenticated.account.inquiries.tsx` (list)
- Remove the duplicate "Details" button when status is `quoted` (Review Quote already opens details). Keep "Details" only for non-actionable statuses (new, contacted, cancelled).
- Keep "Pay Now" shortcut for `accepted` rows.

### `src/routes/_authenticated.account.inquiries.$id.tsx` (Review Quote / detail)
- After `Accept & Pay` succeeds, DO NOT auto-navigate. Instead:
  - Invalidate the inquiry query so the page re-renders with `status = accepted`.
  - Show a prominent inline "Pay Now" panel with payment method selector + Confirm button (inlined the mini form from the `/pay` page: Bank Transfer / WhatsApp + optional reference).
  - Keep a secondary link to the full `/pay` page for users who prefer it.
- Show a clear success state after the payment intent is recorded (status becomes `pending_payment`): green confirmation block + link to `/account/orders/$id`.
- Ensure the Accept button is disabled and shows a spinner state while pending, and surfaces error toasts (already partially wired).

### `src/routes/_authenticated.account.inquiries.$id.pay.tsx`
- Keep as-is (still accessible via the shortcut from the list or the secondary link on detail).

## No backend changes
The existing `acceptQuote` and `recordPaymentIntent` server functions already do the right thing — this is purely a UX fix on the client so the buttons behave consistently and payment can be completed on the Review Quote screen itself.
