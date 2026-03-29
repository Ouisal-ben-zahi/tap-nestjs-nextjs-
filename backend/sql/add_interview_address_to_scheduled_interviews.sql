-- Lieu d'entretien pour les modalités en présentiel (recruiter_scheduled_interviews).
-- À exécuter une fois sur Supabase / Postgres.

ALTER TABLE public.recruiter_scheduled_interviews
  ADD COLUMN IF NOT EXISTS interview_address text;

COMMENT ON COLUMN public.recruiter_scheduled_interviews.interview_address IS
  'Adresse du lieu (présentiel uniquement), communiquée au candidat.';
