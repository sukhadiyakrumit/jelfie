
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  metal TEXT,
  gemstone TEXT,
  weight_grams NUMERIC(8,2),
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view products" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product images" ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert product images" ON public.product_images
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product images" ON public.product_images
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product images" ON public.product_images
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_product_images_product ON public.product_images(product_id, sort_order);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_category ON public.products(category);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for product-images bucket (bucket created separately)
CREATE POLICY "Public can view product image files"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product image files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product image files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product image files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Demo products
INSERT INTO public.products (slug, name, category, metal, gemstone, weight_grams, price_usd, description, is_featured) VALUES
('solstice-solitaire', 'The Solstice Solitaire', 'rings', 'gold', 'diamond', 4.20, 4200, 'A timeless solitaire diamond ring set in 18k yellow gold, hand-finished by our master jewellers.', true),
('meridian-sapphire-chain', 'Meridian Sapphire Chain', 'necklaces', 'gold', 'sapphire', 3.80, 1850, 'A delicate gold chain anchored with a Ceylon sapphire — quietly luminous, perfectly weighted.', true),
('heirloom-deco-studs', 'Heirloom Deco Studs', 'earrings', 'gold', 'diamond', 2.10, 2100, 'Art-deco inspired diamond studs in white gold. Architectural, refined, made to be worn forever.', true),
('celestial-tangle-cuff', 'Celestial Tangle Cuff', 'bracelets', 'gold', 'none', 12.50, 950, 'A woven gold cuff that catches the light like still water. Substantial, sculptural, singular.', true),
('eternity-band', 'Eternity Band', 'rings', 'gold', 'diamond', 3.10, 2800, 'Pavé diamonds set in a continuous gold band — a quiet promise made tangible.', false),
('rose-aurora-pendant', 'Rose Aurora Pendant', 'necklaces', 'rose gold', 'diamond', 2.40, 1450, 'A single rose-gold pendant cradling a brilliant diamond, suspended on a fine chain.', false),
('astral-drop-earrings', 'Astral Drop Earrings', 'earrings', 'platinum', 'diamond', 5.60, 3600, 'Slender platinum drops finishing in a pavé teardrop — designed to move with you.', false),
('orchid-bangle', 'Orchid Bangle', 'bangles', 'gold', 'emerald', 18.20, 5200, 'A hand-engraved gold bangle inset with a Zambian emerald cabochon. Heirloom-grade craftsmanship.', false),
('moonlit-pearl-strand', 'Moonlit Pearl Strand', 'necklaces', 'silver', 'pearl', 22.00, 1280, 'South Sea pearls hand-knotted on silk, finished with a sterling silver clasp.', false),
('silken-thread-ring', 'Silken Thread Ring', 'rings', 'silver', 'none', 2.80, 320, 'A minimal sterling silver band brushed to a soft satin finish. Wear alone or stacked.', false),
('amber-twilight-pendant', 'Amber Twilight Pendant', 'pendants', 'gold', 'ruby', 4.10, 2950, 'A pigeon-blood ruby haloed in pavé diamonds, suspended on a fine gold chain.', false),
('vesper-hoop-earrings', 'Vesper Hoop Earrings', 'earrings', 'gold', 'none', 6.80, 780, 'Slim, perfectly weighted gold hoops. The kind of piece you never take off.', false);
