# Quotation → Contract → Payment → Order → Feedback Flow

Extend the existing "Request Quotation" path (orders ≥ $1000) into a complete lifecycle. Instant checkout (< $1000) stays untouched.

## Status Lifecycle (quotation orders)

```text
new  →  quoted  →  accepted  →  paid  →  processing  →  shipped  →  in_transit  →  delivered  →  closed
              ↘  cancelled (user rejects)
              ↘  cancelled (admin cancels)
```

- `new` — user submitted request. Admin sees it in Quotations.
- `quoted` — admin entered `final_price_usd` and (optional) note. User is notified in Account.
- `accepted` — user clicked Accept. Moves into Payment.
- `cancelled` — user clicked Reject, or admin cancelled.
- `paid` — payment recorded (manual for now; Stripe deferred).
- `processing / shipped / in_transit / delivered` — admin advances as fulfilment progresses.
- `closed` — delivered + feedback window closed (optional).

## Schema Changes (migration)

Add to `quote_requests`:

- `final_price_usd numeric` — admin's final quoted price
- `quoted_at timestamptz`
- `quote_note text` — admin's message to customer with the quote
- `accepted_at timestamptz`
- `rejected_at timestamptz`
- `rejection_reason text`

No new tables needed — `payments`, `order_status_history`, `order_documents`, `product_reviews` already exist.

## Admin Side

`**/admin/quotations**` (`_authenticated.admin.quotations.tsx`)

- Row action "Send Quote" opens a drawer: input `final_price_usd`, textarea `quote_note` → sets status to `quoted`, stamps `quoted_at`.
- Status filter updated to full lifecycle (new, quoted, accepted, cancelled, paid, processing, shipped, in_transit, delivered).
- Once status ≥ `accepted`, this record also surfaces in `/admin/orders` (currently filtered to `order_type='instant'` only — widen to include `order_type='quotation' AND status IN ('accepted','paid',…)`).

`**/admin/orders/$id**`

- Existing shipping/status/document/payment controls apply.
- Show `final_price_usd` when present; use it as the amount for payment recording.

## User Side

`**/account/inquiries**` (list — already exists)

- Show status badge + final price when `quoted`.
- Row action: "Review Quote" → detail page.

`**/account/inquiries/$id**` (new route)

- Renders items, original total, admin's `final_price_usd`, `quote_note`.
- When status = `quoted`: two buttons — **Accept Quote** (→ `accepted`, stamps `accepted_at`) and **Reject Quote** (opens reason textarea → `cancelled`, stamps `rejected_at`, saves `rejection_reason`).
- When status = `accepted`: shows "Proceed to Payment" CTA → `/account/inquiries/$id/pay`.
- When status ≥ `paid`: redirect / link to `/account/orders/$id` (same underlying row).

`**/account/inquiries/$id/pay**` (new route)

- Payment options screen. Since Stripe is deferred, offer:
  - **Bank Transfer** — shows bank details + "I have transferred" button; creates a `payments` row with `status='pending'`, `method='bank_transfer'`. Admin confirms in `/admin/orders/$id`, which flips quote status to `paid`.
  - **Contact for Payment** — WhatsApp deep link to arrange payment.
- Once quote status becomes `paid`, this route redirects to `/account/orders/$id`.

`**/account/orders**` — widen filter to include quotation-type rows whose status ≥ `paid`, so paid quotes appear alongside instant orders. Instant orders keep working as-is.

`**/account/orders/$id**`

- Existing status timeline + documents + payments UI already covers the fulfilment updates. No changes needed beyond ensuring quotation orders render (they will, since it selects by id + user).
- When status = `delivered`, render a **Leave a Review** button per item that opens the existing `product_reviews` flow (verified via `quote_request_items.product_id`).

## Server Functions

New functions in `src/lib/`:

- `admin/quotations.functions.ts`
  - `sendQuote({ id, final_price_usd, quote_note })` — admin-only, sets status `quoted`.
- `account/quotes.functions.ts` (new file)
  - `getMyInquiry({ id })` — full detail incl. final price and note.
  - `acceptQuote({ id })` — user, only when status = `quoted`.
  - `rejectQuote({ id, reason })` — user, only when status = `quoted`.
  - `recordPaymentIntent({ id, method })` — creates pending `payments` row.
- `account/reviews.functions.ts` (new)
  - `createProductReview({ product_id, quote_id, rating, title, body })` — verifies the user actually purchased+received the product.

## Notifications (light-touch)

Use `toast` in-app on state transitions. No email work in this pass (can be added later).

## Files Touched

- New migration (schema additions)
- `src/lib/admin/quotations.functions.ts` (add `sendQuote`)
- `src/lib/account/quotes.functions.ts` (new)
- `src/lib/account/reviews.functions.ts` (new)
- `src/lib/account/orders.functions.ts` (widen `getMyOrders` filter)
- `src/lib/admin/dashboard.functions.ts` (stats include quotation orders once paid)
- `src/routes/_authenticated.admin.quotations.tsx` (Send Quote drawer, expanded status set)
- `src/routes/_authenticated.account.inquiries.tsx` (badges + Review link)
- `src/routes/_authenticated.account.inquiries.$id.tsx` (new — quote review + accept/reject)
- `src/routes/_authenticated.account.inquiries.$id.pay.tsx` (new — payment options)
- `src/routes/_authenticated.account.orders.$id.tsx` (leave-review button when delivered)
- `src/lib/account/status.ts` (no changes; statuses already covered)

## Out of Scope (this pass)

- Real Stripe/card checkout — payment is manual (bank transfer + admin confirms). Can be layered in later without changing this flow.
- Email/WhatsApp notifications on each transition.
- Partial payments / deposits.