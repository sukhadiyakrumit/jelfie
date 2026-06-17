
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Drop dependent policies on public tables
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual ILIKE '%has_role%' OR with_check ILIKE '%has_role%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Drop storage policies that reference public.has_role
DROP POLICY IF EXISTS "Admins can upload product image files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product image files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product image files" ON storage.objects;

-- Recreate public table policies
CREATE POLICY "Admins manage products" ON public.products
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage product images" ON public.product_images
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user roles" ON public.user_roles
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Recreate storage policies
CREATE POLICY "Admins can upload product image files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product image files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product image files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'));

-- Drop the public version now that nothing depends on it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
