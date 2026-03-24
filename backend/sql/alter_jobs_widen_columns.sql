-- À exécuter sur la base (Supabase SQL editor ou psql) si la mise à jour d’offre échoue
-- avec une erreur du type « value too long for type character varying(50) ».
-- La localisation (plusieurs villes + pays) et le nom d’entreprise dépassaient souvent les limites.

ALTER TABLE jobs
  ALTER COLUMN location_type TYPE varchar(500);

ALTER TABLE jobs
  ALTER COLUMN entreprise TYPE varchar(255);

ALTER TABLE jobs
  ALTER COLUMN tasks_other TYPE text;
