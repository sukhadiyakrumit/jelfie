## Client Portal — Registered Users

Adds a complete `/account` portal alongside existing `account.orders.tsx` / `account.profile.tsx` / `wishlist.tsx`. Treats `quote_requests` as orders (status drives the milestone timeline). Admin already records `payments` and updates order status; client side is read-only for those.

### New routes (all under `_authenticated/`)
```
/account                  Dashboard (stats + recent activity)
/account/orders           Order history (existing — enhanced)
/account/orders/$id       Order detail: timeline, items, documents, payments, invoice, reorder
/account/shipments        Active shipments (orders with status in shipping pipeline)
/account/inquiries        Inquiries list (status = new/pending)
/account/documents        Document Vault (all docs across orders)
/account/wishlist         Saved products (existing — migrated to DB)
/account/payments         Payment history (read-only)
/account/profile          Profile + company info + addresses + contacts (enhanced)
```
A shared `account-sidebar.tsx` mirrors the admin sidebar pattern.

### Database (one migration)

1. **Extend `profiles`**: `company_name`, `company_registration`, `tax_id`, `website`, `billing_address` (jsonb), `shipping_address` (jsonb).
2. **`authorized_contacts`** — multiple contacts per user: `user_id`, `name`, `email`, `phone`, `role`.
3. **`wishlists`** — `user_id`, `product_id`, unique pair. (Migrates today's localStorage wishlist into DB.)
4. **Extend `quote_requests`**:
   - `tracking_number text`, `carrier text`, `estimated_delivery date`
   - status enum widened to: `new, pending, quoted, accepted, payment_pending, paid, processing, shipped, in_transit, delivered, cancelled` (CHECK constraint replaced).
5. **`order_status_history`** — `quote_id`, `status`, `note`, `created_by`, `created_at` — drives the milestone timeline. Trigger auto-inserts a row on every `quote_requests.status` change.
6. **`order_documents`** — `quote_id`, `doc_type` (`invoice|packing_list|bill_of_lading|coa|coo|other`), `file_path`, `file_name`, `uploaded_by`, `uploaded_at`. File bytes live in a new private **`trade-documents`** storage bucket; owner of the quote can read, admin can write.
7. **`payments`** already exists — add `status` (`pending|completed|failed|refunded`) and `invoice_number` so client can see status.

RLS for every new table: owner (`auth.uid() = user_id` or via `quote_id → quote_requests.user_id`) can SELECT; admin can ALL via `private.has_role`. GRANTs included in same migration.

### Server functions (`src/lib/account/*.functions.ts`)
- `getDashboardStats` — counts of orders, active shipments, open inquiries, pending payment.
- `getMyOrders`, `getMyOrder(id)` — order + items + status history + documents + payments.
- `getMyShipments`, `getMyInquiries`, `getMyDocuments`, `getMyPayments`.
- `wishlist.list / add / remove`.
- `repeatOrder(orderId)` — clones items into cart (returns array; client merges into cart store).
- `getInvoicePdfData(orderId)` — returns structured invoice JSON; PDF generated client-side with `jspdf` + `jspdf-autotable` (already common pattern, no native deps; Worker-safe since rendering is in browser).
- `getDocumentSignedUrl(documentId)` — returns a short-lived signed URL from the private bucket after ownership check.
- `updateProfile`, `contacts.list/add/update/remove`.

### Admin additions (small)
- Order detail: status dropdown (writes to `quote_requests.status`, trigger logs history), tracking number/carrier/ETA fields, document upload widget (writes to `order_documents` + storage), payment status edit.
- All gated by existing `requireAdmin`.

### Frontend
- `AccountLayout` with sidebar + outlet.
- Dashboard cards (Orders, Active Shipments, Open Inquiries, Pending Payment) + recent orders table + recent documents.
- Order detail page: vertical milestone timeline from `order_status_history`, items table, documents list (download via signed URL), payments table, "Download Invoice PDF" and "Reorder" buttons.
- Document Vault: filterable table grouped by order.
- Wishlist: migrated from localStorage to DB-backed; "Add all to cart" + "Request quote".
- Profile: tabs — Personal, Company, Billing Address, Shipping Address, Authorized Contacts.

### Out of scope (per earlier decisions)
- No new payments module / no online checkout — payments remain admin-recorded; client only views status.
- No carrier API integration — tracking is admin-entered.

### Tech notes
- Invoice PDF: `jspdf` + `jspdf-autotable` in browser (no server image libs → Worker-safe).
- Storage bucket `trade-documents` created via `supabase--storage_create_bucket` (private); RLS on `storage.objects` restricts read to order owner + admin.
- Realtime subscription on `quote_requests` + `order_status_history` for the open order detail page so status updates appear live.
