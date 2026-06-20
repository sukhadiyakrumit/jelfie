
-- 1) Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_registration text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- 2) Authorized contacts
CREATE TABLE IF NOT EXISTS public.authorized_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authorized_contacts TO authenticated;
GRANT ALL ON public.authorized_contacts TO service_role;
ALTER TABLE public.authorized_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own contacts" ON public.authorized_contacts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin all contacts" ON public.authorized_contacts
  FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.authorized_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Wishlists
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own wishlist" ON public.wishlists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Quote/order extensions
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS estimated_delivery date;

ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_status_check;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_status_check
  CHECK (status IN ('new','contacted','quoted','accepted','payment_pending','paid','processing','shipped','in_transit','delivered','closed','cancelled'));

-- 5) Order status history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own status history" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_id AND q.user_id = auth.uid())
  );
CREATE POLICY "admin all status history" ON public.order_status_history
  FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_quote_status_log ON public.quote_requests;
CREATE TRIGGER trg_quote_status_log AFTER INSERT OR UPDATE OF status ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_quote_status_change();

INSERT INTO public.order_status_history (quote_id, status, created_by, created_at)
SELECT id, status, user_id, created_at FROM public.quote_requests
WHERE NOT EXISTS (SELECT 1 FROM public.order_status_history h WHERE h.quote_id = quote_requests.id);

-- 6) Order documents
CREATE TABLE IF NOT EXISTS public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('invoice','packing_list','bill_of_lading','coa','coo','other')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;
ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own docs" ON public.order_documents
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_id AND q.user_id = auth.uid())
  );
CREATE POLICY "admin all docs" ON public.order_documents
  FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

-- 7) Payments status + invoice number
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending','completed','failed','refunded')),
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- 8) Storage policies for trade-documents (bucket created via tool)
CREATE POLICY "users read own trade docs" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'trade-documents' AND EXISTS (
      SELECT 1 FROM public.order_documents d
      JOIN public.quote_requests q ON q.id = d.quote_id
      WHERE d.file_path = storage.objects.name AND q.user_id = auth.uid()
    )
  );
CREATE POLICY "admin all trade docs" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'trade-documents' AND private.has_role(auth.uid(),'admin')
  ) WITH CHECK (
    bucket_id = 'trade-documents' AND private.has_role(auth.uid(),'admin')
  );
