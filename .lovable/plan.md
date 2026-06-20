## Root cause

Every client/server query to `public.user_roles` is returning `403 permission denied for function has_role`. The RLS policy on `user_roles` calls `private.has_role(auth.uid(), 'admin')`, but `EXECUTE` on that function was never granted to `authenticated` / `anon`. So:

- The header's admin-badge check fails (network log shows the 403).
- The first-time `claimAdmin` path can't read `user_roles`.
- All admin server functions that call `_shared.requireAdmin()` (Dashboard, Quotations, Categories, Products, Orders, Payments, Users, Feedback) fail — meaning the entire `/admin` panel is broken for everyone.
- Any other policy that references `private.has_role` (products write, categories write, payments, contact_messages admin view, reviews moderation, etc.) fails the same way.

## Fix

One migration that:

1. `GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, anon, service_role;`
2. `GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;` (required for the role to even resolve `private.has_role`).
3. Sanity re-grants on `public.user_roles` so `authenticated` can SELECT/INSERT/DELETE (needed for `claimAdmin` and Manage Users), and `service_role` retains ALL.

No code changes required — once the grants are in place the existing `has_role` RLS checks resolve, the header badge appears for admins, `claimAdmin` works, and every admin server function passes `requireAdmin`.

## Verification after migration

- Reload `/` as the signed-in user → `GET /rest/v1/user_roles?...role=eq.admin` returns 200 (rows or empty array, no 403).
- Visit `/admin` → dashboard loads, sidebar links open without "Forbidden".
- Manage Users → assign/revoke admin works.
