-- Two-track orders: distinguish instant checkout vs quotation
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'quotation',
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.quote_requests SET order_type = 'quotation' WHERE order_type IS NULL;

ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_order_type_check;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_order_type_check CHECK (order_type IN ('instant','quotation'));

ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_status_check;
ALTER TABLE public.quote_requests
  ADD CONSTRAINT quote_requests_status_check CHECK (status IN (
    'new','contacted','quoted','accepted','payment_pending','pending_payment','paid',
    'processing','shipped','in_transit','delivered','closed','cancelled'
  ));

CREATE INDEX IF NOT EXISTS quote_requests_user_type_idx ON public.quote_requests (user_id, order_type);
CREATE INDEX IF NOT EXISTS quote_requests_type_status_idx ON public.quote_requests (order_type, status);
CREATE INDEX IF NOT EXISTS quote_requests_stripe_session_idx ON public.quote_requests (stripe_session_id);
