"""
Legacy MySQL connection module.

Le projet a été migré intégralement vers Supabase (PostgreSQL + Storage).
Ce module est conservé uniquement pour compatibilité d'import mais ne doit plus être utilisé.
Toute tentative d'accès lèvera une erreur explicite.
"""

from typing import Any


class DatabaseConnection:
    """Deprecated. Use Supabase (`supabase_db`) instead of MySQL."""

    @classmethod
    def initialize(cls, *args: Any, **kwargs: Any) -> None:
        raise RuntimeError(
            "DatabaseConnection (MySQL) est déprécié. "
            "Toute la persistance passe maintenant par Supabase (`supabase_db`)."
        )

    @classmethod
    def get_connection(cls, *args: Any, **kwargs: Any):
        raise RuntimeError(
            "DatabaseConnection.get_connection ne doit plus être appelé. "
            "Remplacez par des appels à Supabase."
        )

    @classmethod
    def get_connection_raw(cls, *args: Any, **kwargs: Any):
        raise RuntimeError(
            "DatabaseConnection.get_connection_raw ne doit plus être appelé. "
            "Remplacez par des appels à Supabase."
        )

    @classmethod
    def execute_query(cls, *args: Any, **kwargs: Any):
        raise RuntimeError(
            "DatabaseConnection.execute_query ne doit plus être appelé. "
            "Remplacez par des appels à Supabase."
        )

    @classmethod
    def execute_many(cls, *args: Any, **kwargs: Any):
        raise RuntimeError(
            "DatabaseConnection.execute_many ne doit plus être appelé. "
            "Remplacez par des appels à Supabase."
        )

