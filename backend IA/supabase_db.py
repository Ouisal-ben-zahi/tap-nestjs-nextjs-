import os

from dotenv import load_dotenv
from supabase import Client, create_client


# Prioriser les valeurs du .env local du projet.
load_dotenv(override=True)


def _create_supabase_client() -> Client | None:
    url = os.getenv("supabase_url")
    key = os.getenv("supabase_secret_key")
    if not url or not key:
        print("Supabase DB non configuré (supabase_url / supabase_secret_key manquants)")
        return None
    try:
        client: Client = create_client(url, key)
        print("Supabase DB client initialisé")
        return client
    except Exception as e:
        print(f"Erreur d'initialisation du client Supabase DB: {e}")
        return None


supabase_db: Client | None = _create_supabase_client()

