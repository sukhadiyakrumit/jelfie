
# Jelfie Jewellers — International Jewellery Ecommerce

A storefront for showcasing jewellery internationally, with cart, wishlist, multi-currency display, and a WhatsApp-based quote/order flow. Admin panel (login-protected) to manage products. No customer checkout — every order/quote is a prefilled WhatsApp message to **+91 9825845024**.

## What gets built

### Public storefront
- **Home** — hero, featured collections, brand story, CTA
- **Shop / Catalog** — grid of products with filters: category (rings, necklaces, earrings, bracelets, bangles, pendants), metal (gold, silver, rose gold, platinum), gemstone (diamond, ruby, emerald, sapphire, pearl, none), price range
- **Product detail** — image gallery, description, metal/gemstone/weight specs, price (in selected currency), "Add to cart", "Add to wishlist", "Request quote on WhatsApp" (single-product shortcut)
- **Cart / Quote summary** — list of selected items with quantities; one button "Send quote request on WhatsApp" → opens `wa.me/919825845024` with a prefilled message listing each item, link, qty, and total
- **Wishlist** — saved items (stored in browser `localStorage`, no login needed)
- **About** and **Contact** pages — brand story, WhatsApp contact button
- **Currency switcher** in header — USD, EUR, GBP, INR (USD base; static FX rates stored in code, easy to edit)

### Admin (login-protected, owner only)
- `/admin/login` — email + password sign-in
- `/admin/products` — list, search, create, edit, delete products
- `/admin/products/new` and `/admin/products/:id` — form with name, category, metal, gemstone, weight, base price (USD), description, image uploads (multiple), featured toggle, in-stock toggle
- Image upload to cloud storage; admin can reorder/remove images

### WhatsApp flow (no API, just `wa.me` links)
- Single product: "Request quote" button → opens WhatsApp with message like:
  > Hi Jelfie Jewellers, I'd like a quote for: *Aurora Diamond Ring* (SKU JLF-R-018) — USD 1,250. Link: https://yourdomain.com/product/aurora-diamond-ring
- Cart: lists every item, qty, subtotal, then total — same prefill pattern
- Works on mobile and desktop (desktop opens WhatsApp Web)

### Design
Since you chose "explore design directions," before building the UI I'll generate 3 rendered design directions tailored to a luxury jewellery brand (different takes on luxe classic / modern editorial / dark gemstone-forward) and you pick one. The chosen direction's palette, typography, and composition then drive every page.

## Technical section

- **Stack**: TanStack Start (already set up) + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Postgres + Auth + Storage)
- **Tables**:
  - `products` (id, slug, name, category, metal, gemstone, weight_grams, price_usd, description, is_featured, in_stock, created_at)
  - `product_images` (id, product_id, url, sort_order)
  - `user_roles` (id, user_id, role) + `has_role()` security-definer function — for admin gating (per platform rules; never store role on profile)
  - RLS: public `SELECT` on products/images; `INSERT/UPDATE/DELETE` restricted to admin role
- **Storage**: `product-images` bucket, public read, admin write
- **Auth**: email/password only (no shopper accounts). First admin seeded by you signing up, then promoting your user_id to `admin` role via a one-time migration or admin-bootstrap server function
- **Cart & wishlist**: client-side `localStorage` (no DB, no login)
- **Currency**: static rate object in code with a hook `useCurrency()` — formats `price_usd × rate` per selected currency, persists choice in `localStorage`
- **Routes** (TanStack file-based):
  - `/` (home), `/shop`, `/product/$slug`, `/cart`, `/wishlist`, `/about`, `/contact`
  - `/auth` (admin login)
  - `/_authenticated/admin/products`, `/_authenticated/admin/products/new`, `/_authenticated/admin/products/$id`
- **Server functions** for admin writes (`requireSupabaseAuth` + admin role check). Public reads use a public server fn elevating via `supabaseAdmin` with safe column projection.
- **SEO**: per-route `head()` with title, description, OG tags; product pages set `og:image` from first product image

## Out of scope (can be added later)
- Online payments / checkout
- Shopper accounts, order history in-app
- Live FX rates (we use static rates you can edit)
- Reviews, ratings, blog
- Shipping calculator, tax
- WhatsApp Business API auto-send

## Build sequence
1. Enable Lovable Cloud + create schema, RLS, storage bucket
2. Generate 3 design directions → you pick one
3. Build public storefront (home, shop, product, cart, wishlist, about, contact) in chosen direction
4. Build admin (auth, product CRUD, image upload)
5. Wire WhatsApp links, currency switcher, SEO metadata
6. Seed a handful of demo products so the site is browsable; you replace them via admin later
