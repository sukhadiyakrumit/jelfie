## Goal
Replace the dummy checkout on `/checkout/pay/$id` with a real Razorpay Checkout integration. Order is marked `paid` only after Razorpay confirms payment and the signature is verified server-side. Charges go through in **USD** (requires international/USD-enabled Razorpay account).

## Step 0 — Get Razorpay test keys (user does this once)
Before we can code the integration, you need Razorpay API keys. I'll explain in chat, not in code:

1. Go to https://razorpay.com and sign up (free, no docs required, works with just an email).
2. On the dashboard, stay in **Test Mode** (toggle top-right).
3. Go to **Account & Settings → API Keys → Generate Test Key**.
4. Copy the **Key ID** (starts with `rzp_test_...`) and the **Key Secret**.
5. Because we're charging in USD: request USD support via **Account & Settings → International Payments**. In test mode USD often works out of the box; if Razorpay refuses `currency: "USD"` at order-create time we'll switch to INR conversion.

Once you have both values, I'll open a secure form to save them.

## Step 1 — Save secrets
When we move to build mode I'll call `add_secret` for:
- `RAZORPAY_KEY_ID` — public-ish, used server-side to create orders and returned to the browser so Checkout knows which merchant.
- `RAZORPAY_KEY_SECRET` — private, used only server-side for order creation (Basic auth) and HMAC signature verification.

No `.env` changes; the Key ID is returned by the server function so the client never reads env directly.

## Step 2 — Server functions (`src/lib/account/quotes.functions.ts`)
Add two new functions, remove the old `completeDummyPayment`:

**`createRazorpayOrder({ id })`** — auth-protected.
1. Load quote, verify user ownership + status is `accepted` or `pending_payment`.
2. `fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: "Basic " + btoa(KEY_ID + ":" + KEY_SECRET) }, body: JSON.stringify({ amount: Math.round(usd * 100), currency: "USD", receipt: quote.id }) })`.
3. Return `{ razorpayOrderId, amount, currency, keyId }` to the browser.
4. On Razorpay error, surface a clean message (esp. the "USD not enabled" case so you know to enable it).

**`verifyRazorpayPayment({ id, razorpay_order_id, razorpay_payment_id, razorpay_signature })`** — auth-protected.
1. Compute `expected = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)` using Node `crypto`, `timingSafeEqual` compare against `razorpay_signature`.
2. If mismatch → throw; do NOT mark paid.
3. If match → via `supabaseAdmin`: insert `payments` row (method=`razorpay`, reference=`razorpay_payment_id`, status=`completed`, `invoice_number`), update `quote_requests.status='paid'`, `paid_at=now()`.
4. Return `{ ok: true, reference, invoiceNumber }`.

Keep `getPayableOrder` as-is.

## Step 3 — Rewrite `src/routes/_authenticated.checkout.pay.$id.tsx`
- Remove the mock card / UPI / netbanking form and the three method buttons.
- Keep the branded summary header (Razorpay logo, amount, merchant name).
- Single **Pay with Razorpay** button that:
  1. Lazy-loads `https://checkout.razorpay.com/v1/checkout.js` once via a `<script>` inject.
  2. Calls `createRazorpayOrder` → gets `{ razorpayOrderId, amount, currency, keyId }`.
  3. Opens `new window.Razorpay({ key: keyId, order_id: razorpayOrderId, amount, currency, name: "Jelfie Jewellers", description: "Order " + id, prefill: { email, name } from profile if available, theme: { color: "#0c2451" }, handler: async (resp) => { await verifyRazorpayPayment({ data: { id, ...resp } }); toast + invalidate + navigate → /account/orders/$id; }, modal: { ondismiss: () => toast("Payment cancelled") } }).open()`.
  4. Also listens for `rzp.on('payment.failed', ...)` to show a toast.
- Cancel link continues to work as it does today.

## Step 4 — Testing
1. In test mode, use card `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`.
2. Confirm: modal opens, payment succeeds, order flips to `paid`, appears in `/account/orders`, invoice download unlocked.
3. Close modal before paying → order stays `accepted`, no `payments` row inserted.
4. If Razorpay returns `"international payments not enabled"` for USD, either enable USD on the dashboard or reply and I'll add INR conversion (fixed configurable rate).

## Out of scope
- Live-mode go-live (just swap the secrets when you're ready).
- Refunds, saved cards, subscriptions.
- Webhooks (signature verify in `handler` covers the happy path; webhook can be added later for abandoned-tab reconciliation).
- Any WhatsApp / admin-payment-panel changes.
