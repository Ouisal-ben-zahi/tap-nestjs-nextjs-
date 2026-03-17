"""
Module legacy MinIO (désactivé).

Le projet TAP utilise désormais exclusivement Supabase Storage pour tous les
fichiers. Ce module est conservé uniquement pour compatibilité d'import et ne
doit plus être utilisé.

Toute tentative d'utilisation lèvera une erreur explicite.
"""

from typing import Any, Optional, Tuple


class MinIOStorage:
    """Deprecated. Utiliser `SupabaseStorage` (module `supabase_storage`) à la place."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        raise RuntimeError(
            "MinIOStorage est déprécié. "
            "Toute la persistance de fichiers passe maintenant par Supabase Storage "
            "(`supabase_storage.get_supabase_storage()`)."
        )

    # Signatures conservées pour éviter de casser les imports / appels potentiels,
    # mais chaque méthode lève aussi une erreur claire.

    def upload_file(
        self,
        file_bytes: bytes,
        object_name: str,
        content_type: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        raise RuntimeError(
            "MinIOStorage.upload_file est déprécié. "
            "Utiliser SupabaseStorage.upload_file à la place."
        )

    def upload_file_from_path(
        self,
        file_path: str,
        object_name: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        raise RuntimeError(
            "MinIOStorage.upload_file_from_path est déprécié. "
            "Utiliser SupabaseStorage.upload_file avec des bytes."
        )

    def get_file_url(self, object_name: str) -> Optional[str]:
        raise RuntimeError(
            "MinIOStorage.get_file_url est déprécié. "
            "Utiliser SupabaseStorage.get_file_url à la place."
        )

    def object_exists(self, object_name: str) -> bool:
        raise RuntimeError(
            "MinIOStorage.object_exists est déprécié. "
            "Supabase Storage doit être utilisé pour toutes les opérations fichiers."
        )

    def download_file(self, object_name: str) -> Tuple[bool, Optional[bytes], Optional[str]]:
        raise RuntimeError(
            "MinIOStorage.download_file est déprécié. "
            "Utiliser SupabaseStorage.download_file à la place."
        )

    def delete_file(self, object_name: str) -> Tuple[bool, Optional[str]]:
        raise RuntimeError(
            "MinIOStorage.delete_file est déprécié. "
            "Utiliser SupabaseStorage.delete_file à la place."
        )

    def get_presigned_url(self, object_name: str, expires: int = 3600) -> Optional[str]:
        raise RuntimeError(
            "MinIOStorage.get_presigned_url est déprécié. "
            "Utiliser SupabaseStorage.get_file_url / create_signed_url à la place."
        )


_minio_storage: Optional[MinIOStorage] = None


def get_minio_storage() -> MinIOStorage:
    """
    Legacy helper.

    Gardé uniquement pour compatibilité, mais lève une erreur explicite afin
    de signaler qu'aucun code ne doit plus dépendre de MinIO.
    """
    raise RuntimeError(
        "get_minio_storage() est déprécié. "
        "Remplacer son utilisation par get_supabase_storage() (module `supabase_storage`)."
    )

