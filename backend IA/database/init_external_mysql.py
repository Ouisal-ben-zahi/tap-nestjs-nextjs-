#!/usr/bin/env python3
"""
Script legacy d'initialisation MySQL (désactivé).

Le projet TAP utilise désormais exclusivement Supabase (PostgreSQL + Storage) pour la base
de données et les fichiers. Ce script n'est plus utilisé et est conservé uniquement
pour référence historique.

Ne plus lancer ce script dans les nouveaux environnements.
"""

if __name__ == "__main__":
    raise SystemExit(
        "init_external_mysql.py est déprécié. "
        "La base de données doit être gérée via Supabase (voir `supabase_db.py`)."
    )
