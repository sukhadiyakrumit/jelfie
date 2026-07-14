## Goal
Give the user a clear, branded "Payment failed" screen with two obvious actions — **Retry Payment** and **Back to Orders** — instead of only a toast that disappears.

## Changes

### `src/routes/_authenticated.checkout.pay.$id.tsx`
1. Add local state `failure: { message: string; code?: string; paymentId?: string } | null`.
2. Set `failure` in three places (in addition to the existing toast, which stays for quick feedback):
   - Razorpay `payment.failed` event → `{ message: resp.error.description, code: resp.error.code, paymentId: resp.error.metadata?.payment_id }`.
   - `verify.onError` (signature mismatch or server error) → `{ message: e.message }`.
   - `startPayment` catch block (script load / order create) → `{ message: e.message }`.
3. Clear `failure` to `null` at the top of `startPayment` so retries reset the state.
4. When `failure` is not null, render a new **PaymentFailedCard** in place of the payment button:
   - Red accent header with alert icon and "Payment failed".
   - Show `failure.message`, plus `code` and `paymentId` in small monospaced text when present (helps support debugging).
   - Two buttons:
     - **Retry Payment** — calls `startPayment()` again (opens a fresh Razorpay order).
     - **Back to Orders** — `<Link to="/account/orders">` for pending_payment quotations, or `/account/inquiries/$id` if the order came from a quote (mirrors existing "Cancel and go back" logic). Also expose a subtle **Contact support** link to `/contact`.
   - Keep the summary header (amount, order id) visible above so context isn't lost.
5. The "Cancel and go back" footer link stays.
6. Toast on failure changes to `toast.error(..., { duration: 6000 })` so it lingers a bit while the card also shows.

### No other files change
- Modal `ondismiss` (user closed the popup without paying) keeps its current behavior — a soft "Payment cancelled" toast, no failure card, so a closed modal doesn't look like an error.
- No server function changes; the existing `verifyRazorpayPayment` error messages already surface as `e.message`.

## Verification
1. Trigger a failure with Razorpay test card `4000 0000 0000 0002` → red failure card renders with description, Retry, and Back to Orders buttons.
2. Click **Retry Payment** → a new Razorpay modal opens with a fresh order id; success flow still ends on `/account/orders/$id`.
3. Close the Razorpay modal without paying → soft "Payment cancelled" toast only, no failure card (order stays `pending_payment`).
4. Force a signature-verification error (tamper via devtools) → failure card shows the server's error message and Retry works.

## Out of scope
- Webhook-based reconciliation for abandoned tabs.
- Persisting failed attempts to the `payments` table.
- Email / WhatsApp notifications on failure.
