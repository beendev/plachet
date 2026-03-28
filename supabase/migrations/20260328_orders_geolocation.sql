-- Add geolocation columns for photo before/after
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS photo_before_geo jsonb,
  ADD COLUMN IF NOT EXISTS photo_after_geo jsonb;

COMMENT ON COLUMN public.orders.photo_before_geo IS 'GPS coordinates when photo_before was taken: {lat, lng, accuracy}';
COMMENT ON COLUMN public.orders.photo_after_geo IS 'GPS coordinates when photo_after was taken: {lat, lng, accuracy}';
