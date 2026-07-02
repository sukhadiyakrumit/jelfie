CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (quote_id, status, created_by)
    VALUES (NEW.id, NEW.status, COALESCE(auth.uid(), NEW.user_id));
  END IF;
  RETURN NEW;
END $$;