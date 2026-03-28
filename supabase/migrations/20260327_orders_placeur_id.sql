-- Add placeur_id to orders to track which placeur installed the signage
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS placeur_id integer REFERENCES public.users(id);

-- Index for fast lookup by placeur
CREATE INDEX IF NOT EXISTS idx_orders_placeur_id ON public.orders(placeur_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
