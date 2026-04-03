-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text,                    -- dénomination commerciale
  company_name text,            -- dénomination sociale
  phone text,                   -- téléphone entreprise
  address text,
  street text,
  number text,
  box text,
  zip text,
  city text,
  vat_number text,
  is_vat_liable boolean DEFAULT true,
  bce_number text,
  ipi_number text,
  is_ipi_certified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- 2. Migrate existing data from users to companies (only for syndic users with company data)
INSERT INTO public.companies (user_id, name, company_name, phone, address, street, number, box, zip, city, vat_number, is_vat_liable, bce_number, ipi_number, is_ipi_certified)
SELECT
  id,
  name,
  company_name,
  phone,
  address,
  street,
  number,
  box,
  zip,
  city,
  vat_number,
  COALESCE(is_vat_liable, true),
  bce_number,
  ipi_number,
  COALESCE(is_ipi_certified, false)
FROM public.users
WHERE role = 'syndic'
  AND (company_name IS NOT NULL OR vat_number IS NOT NULL OR name IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Drop company-related columns from users table
-- Keep: id, email, password, role, first_name, last_name, phone (personal), name,
--        profile_completed, email_verified, verification_token, reset_token, reset_token_expires,
--        parent_id, deleted_at, has_full_building_access
ALTER TABLE public.users DROP COLUMN IF EXISTS company_name;
ALTER TABLE public.users DROP COLUMN IF EXISTS address;
ALTER TABLE public.users DROP COLUMN IF EXISTS street;
ALTER TABLE public.users DROP COLUMN IF EXISTS number;
ALTER TABLE public.users DROP COLUMN IF EXISTS box;
ALTER TABLE public.users DROP COLUMN IF EXISTS zip;
ALTER TABLE public.users DROP COLUMN IF EXISTS city;
ALTER TABLE public.users DROP COLUMN IF EXISTS vat_number;
ALTER TABLE public.users DROP COLUMN IF EXISTS bce_number;
ALTER TABLE public.users DROP COLUMN IF EXISTS ipi_number;
ALTER TABLE public.users DROP COLUMN IF EXISTS is_ipi_certified;
ALTER TABLE public.users DROP COLUMN IF EXISTS is_vat_liable;

NOTIFY pgrst, 'reload schema';
