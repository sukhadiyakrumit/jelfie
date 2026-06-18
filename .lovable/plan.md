
## Goal

Add a customer account system to Jelfie Jewellers so shoppers can sign in, manage a profile, view their past WhatsApp quote requests, and are required to log in before sending any WhatsApp quote (single product or cart).

The existing admin login at `/auth` → `/admin/products` stays untouched as a separate flow.

## What you'll see in the app

- New **Account** menu in the header: "Sign in" when logged out, "My account" dropdown (Profile, Orders, Sign out) when logged in.
- New routes:
  - `/account/sign-in` — email/password, Google, and phone OTP tabs.
  - `/account/sign-up` — email/password + name/phone.
  - `/account/profile` — edit full name, phone, shipping address (country, city, address line 1/2, postal code).
  - `/account/orders` — list of past quote requests (date, items, total, "Open in WhatsApp" link to resend).
- Every WhatsApp quote button (product page "Request quote", cart "Send quote on WhatsApp", wishlist quick-quote) checks login first:
  - Logged out → redirect to `/account/sign-in?redirect=<current path>` with a toast "Please sign in to request a quote."
  - Logged in → record the quote in DB, then open `wa.me` link with the prefilled message (your phone + name appended automatically).

## Sign-in methods

- **Email + password** (Lovable Cloud default).
- **Google** — via managed `lovable.auth.signInWithOAuth("google", ...)`.
- **Phone (SMS OTP)** — `supabase.auth.signInWithOtp({ phone })` + verify screen. Note: SMS provider must be enabled in Cloud auth settings; if not yet configured, this tab will show a "coming soon" notice rather than fail.

## Data model (new migration)

- `profiles` (1:1 with `auth.users`): `id` (= auth uid), `full_name`, `phone`, `country`, `city`, `address_line1`, `address_line2`, `postal_code`.
  - Auto-created via trigger `on_auth_user_created` calling `handle_new_user()`.
  - RLS: owner can select/update own row; service_role full.
- `quote_requests`: `user_id`, `currency`, `total_usd`, `whatsapp_url`, `note`, `status` (default `sent`).
- `quote_request_items`: `quote_id`, `product_id`, `name`, `slug`, `price_usd`, `quantity`, `image_url`.
- All tables: GRANT to `authenticated` + `service_role`, RLS scoped to `auth.uid() = user_id`.

Admin role system stays unchanged (`user_roles` + `private.has_role`). Customer accounts simply have no admin role row.

## Code changes

- `src/integrations/lovable/` — created by `configure_social_auth` (Google).
- `src/lib/auth.ts` — `useAuthUser()` hook (subscribes to `onAuthStateChange`), `requireLogin(navigate, redirectPath)` helper.
- `src/lib/quotes.functions.ts` — `createQuoteRequest` (auth-required server fn) that inserts quote + items and returns `whatsapp_url`; `listMyQuotes`.
- `src/lib/whatsapp.ts` — extend message builders to optionally include `{ name, phone }` from profile.
- `src/components/site-header.tsx` — add Account dropdown.
- `src/routes/account.sign-in.tsx`, `account.sign-up.tsx`, `account.profile.tsx`, `account.orders.tsx` — new routes. Profile + orders are gated client-side (redirect if no session) since they're under `/account/*`, not the admin `_authenticated` tree.
- `src/routes/product.$slug.tsx`, `cart.tsx`, `wishlist.tsx` — replace direct `wa.me` link with a handler that calls `createQuoteRequest` then `window.open(url)`.

## Out of scope

- Admin auth/UI is not touched.
- No password reset email flow yet (can add later via `scaffold_auth_email_templates`).
- No order fulfillment status beyond `sent` — this is a quote log, not commerce checkout.

Confirm and I'll implement.
