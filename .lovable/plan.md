# Two Front Doors: Instant Checkout vs Private Consultation

Split the cart flow into two tracks and surface each as a separate order type across the user profile and admin panel. The $300 cutoff (computed on cart subtotal converted to USD from displayed currency) is a **soft rule**: both buttons show on every cart, but the UI highlights the recommended one.

## Recommended track logic

- `subtotalUsd < 300` → **Instant Checkout** highlighted (primary button), Quotation shown as secondary "Prefer to discuss? Request a quote".
- `subtotalUsd ≥ 300` → **Request Quotation** highlighted (primary), Instant Checkout shown as secondary "Or check out now".
- Empty cart → neither.

## Database (1 migration)

`quote_requests` already exists. Add a discriminator and Stripe fields:

- `order_type` text, check in (`'instant'`,`'quotation'`), default `'quotation'`, NOT NULL (backfill existing rows to `'quotation'`).
- `stripe_session_id` text, `stripe_payment_intent` text, `paid_at` timestamptz, all nullable.
- Allowed `status` values extended to include `pending_payment`, `paid` for the instant track.
- Index on `(user_id, order_type)` and `(order_type, status)`.

No new tables. Instant orders reuse `quote_requests` + `quote_request_items` so the entire existing pipeline (status history, documents, payments, invoices, shipments) works for both tracks.

## Stripe (Lovable built-in payments)

Enable via `payments--enable_stripe_payments` (seamless, no API keys needed). After enable, create one generic "Cart checkout" product OR use ad-hoc `price_data` line items per session — we will use ad-hoc line items so any cart contents work.

Server flow:

1. `createInstantCheckout` server fn (auth-required): inserts `quote_requests` row with `order_type='instant'`, `status='pending_payment'`, inserts items, creates Stripe Checkout Session with `line_items` built from cart, `success_url=/account/orders/{id}?paid=1`, `cancel_url=/cart`, metadata `{ quote_id }`. Returns `{ url }`. Client redirects.
2. Stripe webhook at `src/routes/api/public/stripe-webhook.ts`: on `checkout.session.completed`, verify signature, look up `quote_id` from metadata, update row to `status='paid'`, set `stripe_payment_intent`, `paid_at`, and insert a `payments` row (`status='paid'`, method='stripe').

## Cart UI (`src/routes/cart.tsx`)

Replace the single WhatsApp button block with a two-track summary card:

- Subtotal + threshold note ("Orders under $300 USD qualify for instant checkout").
- Primary/secondary buttons per the rule above.
- Instant button calls `createInstantCheckout` then `window.location.href = url`.
- Quotation button keeps the existing `useWhatsappQuote().sendCartQuote` flow but flag the saved row as `order_type='quotation'`.

## Client portal split (`/account`)

- Sidebar entries: rename "Orders" → "Orders" but split the index page into two tabs / two routes:
  - `/account/orders` — Instant orders (paid + pending payment)
  - `/account/inquiries` — already exists; show only `order_type='quotation'`
- `getMyOrders` / `getMyInquiries` server fns filter by `order_type`.
- Order detail page (`/account/orders/$id`) shows a "Pay now" CTA when `status='pending_payment'` (re-opens Stripe session) and a Stripe-paid badge when `status='paid'`.
- Dashboard stats split: "Active orders" vs "Open inquiries".

## Admin panel split (`/admin`)

- Sidebar: existing "Quotations" stays (filters `order_type='quotation'`). Add **"Orders"** entry → `/admin/orders` filters `order_type='instant'`.
- Both reuse the same list/detail components; queries pass `order_type`.
- Admin order detail shows Stripe payment status read-only; admin cannot mark instant orders as paid manually (Stripe webhook owns that).
- Quotation detail keeps existing manual payment + status workflow unchanged.

## Files to touch

New:

- `supabase/migrations/<ts>_two_track_orders.sql`
- `src/lib/checkout.functions.ts` (createInstantCheckout, resumeCheckout)
- `src/routes/api/public/stripe-webhook.ts`
- `src/routes/_authenticated.admin.orders.index.tsx` is repurposed; add list filtering by order_type via search params

Edited:

- `src/routes/cart.tsx` — two-track CTA block
- `src/lib/quotes.functions.ts` — set `order_type='quotation'`
- `src/lib/account/orders.functions.ts` — filter by `order_type='instant'`; new `getMyInquiriesList` (or update existing inquiries fn)
- `src/lib/account/dashboard.functions.ts` — split counters
- `src/lib/admin/quotations.functions.ts` — filter by `order_type='quotation'`
- `src/lib/admin/order-detail.functions.ts` — surface Stripe fields
- `src/components/account/account-sidebar.tsx` and `src/components/admin/admin-sidebar.tsx` — add "Orders" vs "Inquiries"
- `src/routes/_authenticated.account.orders.$id.tsx` — Pay-now CTA + paid badge
- `src/routes/_authenticated.admin.orders.$id.tsx` — show Stripe status
- `src/routes/_authenticated.admin.quotations.tsx` — title/filter clarification

## Out of scope

- Refunds via Stripe (admin can still mark a manual refund note).
- Saved cards / subscriptions.
- Tax automation (will be configured after enable as part of Stripe setup step).
- Changing the $300 threshold per-currency — it stays a USD-based check.