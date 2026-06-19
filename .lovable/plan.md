## Admin Panel Expansion

Build a complete admin panel under `/admin/*` with a persistent sidebar, gated to users with the `admin` role. All sections are fully functional and wired to real data.

### Sections

1. **AdminDashboard** (`/admin`) — KPI cards (total products, pending quotes, users, revenue-equivalent in USD from quotes), recent quotes table, top products.
2. **AdminProfile** (`/admin/profile`) — Admin's own full profile + change password.
3. **ManageQuotation** (`/admin/quotations`) — Replaces "Orders". List all `quote_requests` with customer, items, total, status, expected date of delivery. Update status (new → contacted → closed → cancelled), reopen WhatsApp, add internal note.
4. **ManageProductCategories** (`/admin/categories`) — New `categories` table (name, slug, description, image, sort_order, is_active). CRUD.
5. **ManageProduct** (`/admin/products`) — Existing screen, updated to pick category from new table (migrate text → FK).
6. **ManageOrder** (`/admin/orders`) — Alias view of quotations filtered to `status in (contacted, closed)` — i.e. "active orders" workflow. Same data, different filter/columns (fulfillment-focused).
7. **ManagePayments** (`/admin/payments`) — New `payments` table (quote_id, amount_usd, method, reference, paid_at, notes). Admin manually records payments against a quote. Marks quote as paid.
8. **ManageUsers** (`/admin/users`) — List all users (joined profiles + auth.users via admin client), view profile, assign/revoke `admin` role, view their quote history.
9. **ManageFeedback** (`/admin/feedback`) — Two tabs:
  - **Contact messages** — new `contact_messages` table fed by a new public `/contact` form (name, email, subject, message, status).
  - **Product reviews** — new `product_reviews` table (product_id, user_id, rating 1-5, comment, is_approved). Customers submit on product page when logged in; admin approves/hides.

### Routing & access

- Move admin routes into `src/routes/_authenticated/admin.*` (already pathless-protected).
- Add a second gate layout `_authenticated/admin/route.tsx` (`beforeLoad` calls `requireAdmin` server fn checking `has_role(uid, 'admin')`; redirects non-admins to `/`).
- New admin shell with shadcn `Sidebar` (collapsible, icon-mini): Dashboard, Profile, Quotations, Orders, Payments, Categories, Products, Users, Feedback, Sign out.
- Remove the simple top-bar admin header; sidebar replaces it.

### Database changes (one migration)

- `categories` table + GRANTs + RLS (public SELECT, admin write via `has_role`).
- `products.category_id uuid references categories(id)`; data backfill from existing text `category`; keep old column nullable for transition then drop.
- `payments` table (admin-only RLS).
- `contact_messages` table (anon INSERT, admin SELECT/UPDATE).
- `product_reviews` table (auth INSERT own, public SELECT where approved, admin all).
- `quote_requests`: add `internal_note text`, expand `status` check (`new|contacted|closed|cancelled|paid`).
- Seed default categories (Rings, Necklaces, Earrings, Bracelets).

### Server functions (all `requireSupabaseAuth` + admin check helper)

`src/lib/admin/*.functions.ts`: dashboard stats, list/update quotations, CRUD categories, CRUD payments, list users + role mgmt, list/approve feedback & reviews. Public fns: `submitContactMessage`, `submitProductReview` (auth required).

### Storefront touches (minimal)

- `/contact` page: add working form posting to `submitContactMessage`.
- Product page: "Write a review" section for logged-in users + display approved reviews & avg rating.
- Shop filters: use categories table.

### Out of scope

- Real payment gateway (manual entries only, per your answer).
- Email notifications to customers on status change.
- Bulk import/export.

### Technical notes

- `requireAdmin` middleware = `requireSupabaseAuth` + `has_role(userId,'admin')` check; throws 403 otherwise.
- User listing uses `supabaseAdmin.auth.admin.listUsers()` inside handler (load via `await import`).
- Sidebar uses existing shadcn `Sidebar` components; active route via `useRouterState`.
- First admin: SQL helper note — assign `admin` role via migration to a specified email, or via a one-time bootstrap server fn if no admin exists yet.