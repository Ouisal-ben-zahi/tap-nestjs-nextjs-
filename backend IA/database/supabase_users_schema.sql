-- À exécuter dans le SQL Editor de Supabase (Dashboard > SQL Editor)
-- pour que la table public.users accepte les comptes recruteur en plus des candidats.
--
-- Si la colonne "role" est un ENUM qui ne contient que 'candidat', l'insertion
-- d'un recruteur échoue. Deux options :

-- Option A : La table n'existe pas encore — créer la table avec role en TEXT
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('candidat', 'recruteur')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option B : La colonne role est un ENUM (ex. user_role) qui n'a que 'candidat'
-- Dans le SQL Editor Supabase, exécuter (remplacer user_role par le nom de votre type) :
--   ALTER TYPE user_role ADD VALUE 'recruteur';
-- Si vous ne connaissez pas le nom du type : \dT+ dans psql ou voir les types dans le Dashboard.

-- Vérifier que les deux rôles sont acceptés
-- SELECT * FROM public.users LIMIT 5;
