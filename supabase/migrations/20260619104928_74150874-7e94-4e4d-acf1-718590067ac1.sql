
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (is_active OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admin write categories" ON public.categories FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Rings','rings',1),('Necklaces','necklaces',2),('Earrings','earrings',3),
  ('Bracelets','bracelets',4),('Bangles','bangles',5),('Pendants','pendants',6);

ALTER TABLE public.products ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
UPDATE public.products p SET category_id = c.id FROM public.categories c WHERE lower(p.category) = c.slug;

ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS internal_note text;
ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_status_check;
ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_status_check CHECK (status IN ('new','contacted','closed','cancelled','paid'));

CREATE POLICY "Admin read all quotes" ON public.quote_requests FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admin update quotes" ON public.quote_requests FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admin read all quote items" ON public.quote_request_items FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admin read all profiles" ON public.profiles FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  amount_usd numeric(12,2) NOT NULL,
  method text NOT NULL,
  reference text,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all payments" ON public.payments FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_id AND q.user_id = auth.uid()));
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','archived')),
  reply_note text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin manage contact" ON public.contact_messages FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER set_updated_at_contact BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT USING (is_approved OR auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Users submit own review" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admin/owner delete review" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
