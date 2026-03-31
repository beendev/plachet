-- Add is_vat_liable column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_vat_liable boolean DEFAULT true;

NOTIFY pgrst, 'reload schema';
