
## Goal
Strip WhatsApp from the entire site (customer + admin). Replace the manual "record payment intent" flow with a dummy Razorpay checkout that auto-marks the order as **paid** with no admin action. Gate the invoice download behind a paid status.

## 1. Remove WhatsApp surface

**Delete**
- `src/lib/whatsapp.ts`
- `src/lib/use-whatsapp-quote.ts`
- `src/routes/_authenticated.account.inquiries.$id.pay.tsx` (replaced by shared payment route)

**Edit — strip WhatsApp UI/links**
- `src/routes/cart.tsx` — remove `useWhatsappQuote`; keep the "Private Consultation → Request a quotation" card but rename button to **"Request Quotation"**. On click: call `createQuoteRequest` directly (no WhatsApp URL) and redirect to `/account/inquiries`.
- `src/routes/product.$slug.tsx` — same treatment: button becomes **"Request Quote"**; calls `createQuoteRequest` for a single item and redirects to `/account/inquiries`.
- `src/routes/index.tsx` — remove the WhatsApp CTA section entirely; replace with a Contact CTA linking to `/contact`.
- `src/routes/contact.tsx` — remove WhatsApp CTA button, WhatsApp contact card, and copy referencing WhatsApp.
- `src/components/site-footer.tsx` — remove the WhatsApp link.
- `src/routes/__root.tsx` — update meta description (drop "Request a quote on WhatsApp").
- `src/routes/_authenticated.admin.quotations.tsx` — remove the WhatsApp `ExternalLink` icon/button on each row and the `whatsappUrl` check.

**Server functions — drop WhatsApp requirement**
- `src/lib/quotes.functions.ts`: remove `whatsappUrl` from input schema and the `isSafeWhatsappUrl` check. Insert `whatsapp_url: ""` (column stays; no migration needed).
- `src/lib/checkout.functions.ts`: already sets `whatsapp_url: ""`; no schema change.

## 2. Dummy Razorpay payment page

**New file `src/routes/checkout.pay.$id.tsx`** (`_authenticated` gated via layout):
- Loader-less; reads `id` param.
- Fetches order via a new `getPayableOrder` server fn — returns id, amount (final_price_usd ?? total_usd), currency, status, order_type. Rejects orders not in `pending_payment` (instant) or `accepted` (quote).
- Renders a mock "Razorpay-style" checkout modal: brand header, amount, dummy card/UPI selector (visual only, no real input required), and a **"Pay ₹/$ amount"** button. Includes a note "Dummy payment gateway (Razorpay sandbox mock) — no real charge".
- On Pay: call `completeDummyPayment({ id, method })`.
- On success: toast, invalidate queries, redirect to `/account/orders/$id`.

**New server fn in `src/lib/account/quotes.functions.ts` (rename module scope or add):**
`completeDummyPayment` — auth-required:
1. Load `quote_requests` row for `userId`; must be `pending_payment` OR `accepted`.
2. Compute amount = `final_price_usd ?? total_usd`.
3. Insert `payments` row with `status='completed'`, `method='razorpay'`, `reference` = generated `RZP_<random>`, `paid_at=now()`, generated `invoice_number` = `INV-<yyyymm>-<shortid>`.
4. Update `quote_requests` → `status='paid'`, `paid_at=now()`.
5. Return `{ ok: true, id }`.

Delete the old `recordPaymentIntent` (no longer called anywhere).

## 3. Wire the new payment page into the two flows

**Instant checkout (Path 3)** — `src/routes/cart.tsx`
After `createInstantOrder` returns `{ id }`, navigate to `/checkout/pay/$id` instead of `/account/orders/$id`.

**Accepted quote (Path 7)** — `src/routes/_authenticated.account.inquiries.$id.tsx`
- Remove the inline payment-method panel (bank transfer / WhatsApp radios).
- When `status === "accepted"`, show a single **"Pay Now"** button → `Link to="/checkout/pay/$id"`.
- Keep Accept / Decline behaviour on `status === "quoted"`.

**Inquiries list** — `src/routes/_authenticated.account.inquiries.tsx`
Change the `Pay Now` link `to` from `/account/inquiries/$id/pay` to `/checkout/pay/$id`.

## 4. Admin fulfilment (Path 8)

`src/routes/_authenticated.admin.orders.tsx` and `src/routes/_authenticated.admin.orders.$id.tsx` already display orders once payment is recorded and offer the `paid → processing → shipped → in_transit → delivered` status transitions plus document upload. No change needed beyond the admin quotations WhatsApp icon removal above; document-upload UI in the admin order detail page stays as-is.

Verify (read-only) that admin listing already surfaces orders with `status='paid'` (it does — no filter change required).

## 5. Invoice download gating

`src/routes/_authenticated.account.orders.$id.tsx`:
Render the **Invoice** button only when `["paid","processing","shipped","in_transit","delivered","closed"].includes(order.status)`. Otherwise hide it.

## 6. Verification
- Type check + dev server.
- Manual flow via Playwright (optional): Instant cart → checkout redirect → dummy pay → order marked paid → invoice visible.

## Technical Details

- No DB migration required. `whatsapp_url` column stays; we just write `""`. `payments.method` is a free-text column so `'razorpay'` is fine. `payments.status='completed'` (existing values used elsewhere: `pending`, `completed`).
- `completeDummyPayment` uses `supabaseAdmin` for the payments insert (mirrors existing pattern) after verifying ownership via `requireSupabaseAuth`.
- Route path `/checkout/pay/$id` sits under `_authenticated`, so file name is `src/routes/_authenticated.checkout.pay.$id.tsx`.
- All customer-facing copy scrubbed of "WhatsApp"; SEO meta tags refreshed on `__root.tsx`, `index.tsx`, `cart.tsx`, `contact.tsx`.
