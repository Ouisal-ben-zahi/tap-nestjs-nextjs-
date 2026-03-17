"""
Module pour gérer le stockage des fichiers dans Supabase Storage.
"""

import os
from io import BytesIO
from typing import Optional, Tuple

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

# Configuration Supabase depuis les variables d'environnement
SUPABASE_URL = os.getenv("supabase_url")
SUPABASE_KEY = os.getenv("supabase_secret_key")
SUPABASE_BUCKET = os.getenv("supabase_bucket", "tap_files")


class SupabaseStorage:
    """Classe pour gérer les opérations sur Supabase Storage."""

    def __init__(self):
        """Initialise le client Supabase."""
        self.client: Optional[Client] = None
        self.bucket_name: Optional[str] = None

        try:
            if not SUPABASE_URL or not SUPABASE_KEY:
                print("⚠️  Variables d'environnement Supabase manquantes (supabase_url / supabase_secret_key)")
                return

            self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
            self.bucket_name = SUPABASE_BUCKET
            print(f"✅ Supabase client initialisé: {SUPABASE_URL} / bucket={self.bucket_name}")
        except Exception as e:
            import traceback

            error_details = traceback.format_exc()
            print("❌ Erreur d'initialisation Supabase:")
            print(f"   URL: {SUPABASE_URL}")
            print(f"   Bucket: {SUPABASE_BUCKET}")
            print(f"   Erreur: {e}")
            print(f"   Détails:\n{error_details}")
            self.client = None
            self.bucket_name = None

    def upload_file(
        self,
        file_bytes: bytes,
        object_name: str,
        content_type: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Upload un fichier vers Supabase Storage.

        Args:
            file_bytes: Contenu binaire du fichier
            object_name: Chemin / nom de l'objet dans le bucket
            content_type: Type MIME du fichier (optionnel)

        Returns:
            Tuple (success, url, error_message)
        """
        if not self.client or not self.bucket_name:
            return False, None, "Client Supabase non initialisé"

        try:
            # Si aucun content_type n'est fourni, le déduire à partir de l'extension
            if not content_type:
                _, ext = os.path.splitext(object_name)
                ext = (ext or "").lower()
              
            # IMPORTANT : pour le client Python Supabase, les options supportent
            # 'content-type' (MIME) et 'upsert' (pour éviter les erreurs Duplicate).
            # bon pattern
            if content_type:
                options = {"content-type": content_type, "x-upsert": "true"}
            else:
                options = {"x-upsert": "true"}

            # Supabase Storage (client Python v2.x) accepte un chemin de fichier,
            # des bytes ou un PathLike. On lui passe directement les bytes.
            storage = self.client.storage.from_(self.bucket_name)
            response = storage.upload(object_name, file_bytes, options)

            # Selon la version du client, response peut être un dict ou un objet.
            # On considère qu'une exception aurait été levée en cas d'erreur.
            if isinstance(response, dict) and response.get("error"):
                error_msg = str(response["error"])
                print(f"❌ Erreur upload Supabase: {error_msg}")
                return False, None, error_msg

            # Générer une URL signée longue durée pour les logs / débogage,
            # mais on retourne aux appelants le chemin logique (object_name)
            # pour qu'il soit stocké en base comme simple "path".
            try:
                # expires_in est en secondes — 6 mois ~ 6 * 30 jours
                six_months_seconds = 6 * 30 * 24 * 60 * 60
                signed = storage.create_signed_url(object_name, six_months_seconds)
                debug_url = None
                if isinstance(signed, dict):
                    debug_url = signed.get("signedURL") or signed.get("signed_url")
                if not debug_url:
                    # Fallback : URL publique (utile si le bucket est finalement configuré en public)
                    debug_url = storage.get_public_url(object_name)
                print(f"✅ Fichier uploadé vers Supabase Storage: {object_name}")
                # IMPORTANT : on retourne object_name comme "url" logique (chemin),
                # pas l'URL signée avec token, pour que la valeur stockée soit
                # de la forme "candidates/Data science/93/image.jpg".
                return True, object_name, None
            except Exception as sign_err:
                # En cas d'échec de génération d'URL signée, log et fallback sur URL publique
                print(f"⚠️  Erreur génération URL signée Supabase pour {object_name}: {sign_err}")
                try:
                    debug_url = storage.get_public_url(object_name)
                    print(f"✅ Fichier uploadé vers Supabase Storage (URL publique fallback): {object_name}")
                    # Même logique : retourner le chemin logique uniquement.
                    return True, object_name, None
                except Exception as pub_err:
                    error_msg = f"Erreur génération d'URL Supabase (signée et publique) pour {object_name}: {pub_err}"
                    print(f"❌ {error_msg}")
                    return False, None, error_msg

        except Exception as e:
            error_msg = f"Erreur Supabase Storage: {e}"
            print(f"❌ {error_msg}")
            return False, None, error_msg

    def download_file(self, object_name: str) -> Tuple[bool, Optional[bytes], Optional[str]]:
        """
        Télécharge un fichier depuis Supabase Storage.

        Args:
            object_name: Nom de l'objet dans le bucket

        Returns:
            Tuple (success, file_bytes, error_message)
        """
        if not self.client or not self.bucket_name:
            return False, None, "Client Supabase non initialisé"

        try:
            storage = self.client.storage.from_(self.bucket_name)
            file_bytes = storage.download(object_name)
            # Certaines versions renvoient un bytes directement, d'autres un objet Response-like
            if hasattr(file_bytes, "read"):
                file_bytes = file_bytes.read()
            print(f"✅ Fichier téléchargé depuis Supabase Storage: {object_name}")
            return True, file_bytes, None
        except Exception as e:
            error_msg = f"Erreur Supabase lors du téléchargement: {e}"
            print(f"❌ {error_msg}")
            return False, None, error_msg

    def delete_file(self, object_name: str) -> Tuple[bool, Optional[str]]:
        """
        Supprime un fichier de Supabase Storage.

        Args:
            object_name: Nom de l'objet à supprimer

        Returns:
            Tuple (success, error_message)
        """
        if not self.client or not self.bucket_name:
            return False, "Client Supabase non initialisé"

        try:
            storage = self.client.storage.from_(self.bucket_name)
            # remove attend une liste de chemins
            storage.remove([object_name])
            print(f"✅ Fichier supprimé de Supabase Storage: {object_name}")
            return True, None
        except Exception as e:
            error_msg = f"Erreur Supabase lors de la suppression: {e}"
            print(f"❌ {error_msg}")
            return False, error_msg

    def get_file_url(self, object_name: str) -> Optional[str]:
        """
        Génère une URL signée (temporaire) vers un fichier.
        Durée de vie : ~6 mois.
        """
        if not self.client or not self.bucket_name:
            return None

        try:
            storage = self.client.storage.from_(self.bucket_name)
            # expires_in en secondes : 6 mois (~6 * 30 jours)
            six_months_seconds = 6 * 30 * 24 * 60 * 60
            signed = storage.create_signed_url(object_name, six_months_seconds)
            if isinstance(signed, dict):
                return signed.get("signedURL") or signed.get("signed_url")
            # Fallback : URL publique si jamais le bucket est rendu public plus tard
            return storage.get_public_url(object_name)
        except Exception as e:
            print(f"❌ Erreur génération URL signée Supabase: {e}")
            return None


# Instance globale
_supabase_storage: Optional[SupabaseStorage] = None


def get_supabase_storage() -> SupabaseStorage:
    """
    Retourne l'instance globale de SupabaseStorage.
    Réessaie l'initialisation si le client n'est pas initialisé.
    """
    global _supabase_storage
    if _supabase_storage is None or _supabase_storage.client is None:
        print("🔄 Tentative d'initialisation Supabase Storage...")
        _supabase_storage = SupabaseStorage()
        if _supabase_storage.client is None:
            print("⚠️  Supabase Storage n'est pas accessible. Vérifiez la configuration Supabase.")
    return _supabase_storage

