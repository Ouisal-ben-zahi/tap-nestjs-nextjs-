-- Choix du candidat : postuler avec le CV TAP (généré) ou l'ancien CV.
-- use_tap_cv: 1 = CV TAP, 0 = ancien CV. NULL = non renseigné (comportement par défaut).
-- Appliqué à candidate_postule (nom utilisé dans l'app) et recruiter_validated_candidates si présent.
ALTER TABLE candidate_postule
ADD COLUMN use_tap_cv TINYINT(1) NULL DEFAULT NULL
COMMENT '1=CV TAP, 0=ancien CV';

SELECT 'Colonne use_tap_cv ajoutée à candidate_postule.' AS status;
