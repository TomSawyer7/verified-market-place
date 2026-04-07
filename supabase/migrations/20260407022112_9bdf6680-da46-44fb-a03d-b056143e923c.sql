ALTER TABLE public.verifications
  ADD COLUMN IF NOT EXISTS id_last_name text,
  ADD COLUMN IF NOT EXISTS id_first_name text,
  ADD COLUMN IF NOT EXISTS id_middle_name text,
  ADD COLUMN IF NOT EXISTS id_date_of_birth date,
  ADD COLUMN IF NOT EXISTS id_sex text,
  ADD COLUMN IF NOT EXISTS id_blood_type text,
  ADD COLUMN IF NOT EXISTS id_marital_status text,
  ADD COLUMN IF NOT EXISTS id_place_of_birth text,
  ADD COLUMN IF NOT EXISTS admin_reject_reason text;