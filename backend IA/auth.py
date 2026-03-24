from flask import Blueprint, request, jsonify
import re
import traceback
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta, timezone
import random
import smtplib
import ssl
from email.message import EmailMessage

import jwt
from supabase_db import supabase_db
from candidate_minio_path import get_candidate_minio_prefix
from supabase_storage import get_supabase_storage


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _portfolio_pdf_exists(storage, prefix: str, candidate_uuid: str, version: str) -> bool:
  """
  Vérifie si au moins un PDF portfolio existe dans Supabase Storage pour cette version (long ou one-page).
  On teste les variantes FR/EN et on s'arrête au premier fichier trouvé.
  """
  if version == "one-page":
    names = [
      f"{prefix}portfolio_TAP_one-page.pdf",
      f"{prefix}portfolio_TAP_one-page_fr.pdf",
      f"{prefix}portfolio_TAP_one-page_en.pdf",
    ]
  else:
    names = [
      f"{prefix}portfolio_TAP.pdf",
      f"{prefix}portfolio_TAP_fr.pdf",
      f"{prefix}portfolio_TAP_en.pdf",
    ]
  for object_name in names:
    ok, _, _ = storage.download_file(object_name)
    if ok:
      return True
  return False


def _talentcard_pdf_exists(storage, prefix: str, candidate_uuid: str, id_agent: str | None) -> bool:
  """
  Vérifie si un PDF de Talent Card existe dans Supabase Storage.
  On teste d'abord les noms basés sur id_agent (nouvelle convention),
  puis quelques variantes basées sur l'UUID.
  """
  names = []
  # Noms basés sur candidate_uuid (convention actuelle dans A1.talent_html)
  if candidate_uuid:
    names.extend(
      [
        f"{prefix}talentcard_html_TAP.pdf",
        f"{prefix}talentcard_html_TAP_en.pdf",
        f"{prefix}talentcard_TAP.pdf",
        f"{prefix}talentcard_TAP_fr.pdf",
        f"{prefix}talentcard_TAP_en.pdf",
      ]
    )
  # Fallback éventuel basé sur id_agent pour compat
  if id_agent:
    names.append(f"{prefix}talentcard_html_TAP.pdf")
  for object_name in names:
    ok, _, _ = storage.download_file(object_name)
    if ok:
      return True
  return False

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "changeme"))
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", "7"))


def _create_access_token(user_id: int, role: str, email: str) -> str:
  """Crée un JWT simple contenant l'id utilisateur et son rôle. PyJWT exige sub en string."""
  payload = {
      "sub": str(user_id),
      "role": role,
      "email": email,
      "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS),
      "iat": datetime.utcnow(),
  }
  return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _send_verification_email(email: str, code: str) -> None:
  """
  Envoie un code de vérification par email.
  Si la configuration SMTP n'est pas définie, logue simplement le code en console.
  """
  host = os.getenv("SMTP_HOST")
  port = int(os.getenv("SMTP_PORT", "587"))
  user = os.getenv("SMTP_USER")
  password = os.getenv("SMTP_PASSWORD")
  use_tls = (os.getenv("SMTP_USE_TLS", "true").lower() == "true")

  subject = "Votre code de vérification TAP"
  body = (
      "Bonjour,\n\n"
      f"Voici votre code de vérification : {code}\n"
      "Il est valable pendant 15 minutes.\n\n"
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\n"
      "L'équipe TAP"
  )

  # Si pas de config SMTP, on logue le code pour le développement
  if not host or not user or not password:
      print(f"📧 [DEV] Code de vérification pour {email}: {code}")
      return

  try:
      msg = EmailMessage()
      msg["Subject"] = subject
      msg["From"] = user
      msg["To"] = email
      msg.set_content(body)

      context = ssl.create_default_context()
      with smtplib.SMTP(host, port) as server:
          if use_tls:
              server.starttls(context=context)
          server.login(user, password)
          server.send_message(msg)
      print(f"📧 Code de vérification envoyé à {email}")
  except Exception as e:
      # En cas d'erreur d'envoi, on ne bloque pas l'inscription mais on logue l'erreur
      print(f"❌ Erreur lors de l'envoi du code de vérification à {email}: {e}")


def _decode_token_from_request():
  """Récupère et décode le token JWT depuis l'en-tête Authorization."""
  auth_header = request.headers.get("Authorization", "")
  if not auth_header.startswith("Bearer "):
      print("🔐 [Auth] Pas d'en-tête Authorization ou format invalide")
      return None, ("Missing or invalid Authorization header", 401)

  token = auth_header.split(" ", 1)[1].strip()
  if not token:
      print("🔐 [Auth] Token vide")
      return None, ("Missing token", 401)

  try:
      payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
      sub = payload.get("sub")
      user_id = int(sub) if sub is not None else None
      payload["sub"] = user_id  # normaliser en int pour le reste du code
      print(f"🔐 [Auth] user_id reçu du token: {user_id}")
      return payload, None
  except jwt.ExpiredSignatureError:
      print("🔐 [Auth] Token expiré, user_id non disponible")
      return None, ("Token expired", 401)
  except jwt.InvalidTokenError as e:
      print(f"🔐 [Auth] Token invalide (decode failed), user_id non disponible: {e}")
      return None, ("Invalid token", 401)


def get_optional_user():
  """
  Retourne (user_id, role) si la requête contient un token JWT valide et rôle candidat,
  sinon (None, None). Utilisé par les routes qui peuvent être appelées avec ou sans auth
  (ex: /process) pour enregistrer le user_id dès la création du candidat.
  """
  payload, error = _decode_token_from_request()
  if error or not payload:
      return None, None
  user_id = payload.get("sub")
  role = (payload.get("role") or "").strip().lower()
  if role != "candidat" or not user_id:
      return None, None
  return user_id, role


def get_optional_user_from_request():
  """
  Retourne (user_id, role) pour les routes multipart (ex: /process).
  Essaie d'abord l'en-tête Authorization, puis le champ form 'auth_token' si présent.
  """
  # 1) En-tête Authorization
  payload, _ = _decode_token_from_request()
  if payload:
      user_id = payload.get("sub")
      role = (payload.get("role") or "").strip().lower()
      if role == "candidat" and user_id:
          print(f"🔐 [Auth] user_id depuis Authorization: {user_id}")
          return user_id, role
  # 2) Fallback: token dans le formulaire (multipart)
  token = (request.form.get("auth_token") or "").strip() if request.form else None
  if token:
      try:
          payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
          user_id = payload.get("sub")
          if user_id is not None:
              user_id = int(user_id)
          role = (payload.get("role") or "").strip().lower()
          if role == "candidat" and user_id:
              print(f"🔐 [Auth] user_id depuis form auth_token: {user_id}")
              return user_id, role
      except (jwt.InvalidTokenError, ValueError, TypeError):
          pass
  return None, None


@auth_bp.route("/register", methods=["POST"])
def register():
  """
  Inscription d'un utilisateur.
  Body attendu (JSON) :
  {
    "email": "user@example.com",
    "password": "motdepasse",
    "role": "candidat" | "recruteur"
  }
  """
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip().lower()
  password = data.get("password") or ""
  role = (data.get("role") or "").strip().lower()

  # Validation basique du format d'email côté backend
  email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
  if not email or not re.match(email_pattern, email):
      return jsonify({
          "ok": False,
          "error": "INVALID_EMAIL",
          "message": "Veuillez saisir une adresse email valide"
      }), 400

  if not password or role not in ("candidat", "recruteur"):
      return jsonify({
          "ok": False,
          "error": "INVALID_INPUT",
          "message": "email, password et role ('candidat' ou 'recruteur') sont requis"
      }), 400

  password_hash = generate_password_hash(password)

  try:
      if supabase_db is None:
          print("❌ Supabase DB non configuré pour /auth/register")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Configuration Supabase manquante côté serveur"
          }), 500

      # 1) Vérifier l'existence de l'email dans Supabase (source de vérité)
      try:
          resp = supabase_db.table("users").select("id").eq("email", email).limit(1).execute()
          if resp.data:
              return jsonify({
                  "ok": False,
                  "error": "EMAIL_ALREADY_EXISTS",
                  "message": "Un compte existe déjà avec cet email"
              }), 409
      except Exception as e:
          print(f"⚠️  Erreur check email Supabase (register): {e}")

      # 2) Créer l'utilisateur dans Supabase
      code = f"{random.randint(0, 999999):06d}"
      expires_at = datetime.utcnow() + timedelta(minutes=15)

      try:
          insert_resp = supabase_db.table("users").insert(
              {
                  "email": email,
                  "password_hash": password_hash,
                  "role": role,
                  "is_verified": False,
              }
          ).execute()
      except Exception as e:
          print(f"❌ Erreur insertion user dans Supabase (register): {e}")
          traceback.print_exc()
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Erreur serveur lors de la création du compte"
          }), 500

      if not insert_resp.data:
          print("❌ Insertion Supabase users sans retour de données (register)")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Erreur serveur lors de la création du compte"
          }), 500

      user_id = insert_resp.data[0].get("id")

      # 3) Créer le token de vérification email dans Supabase
      try:
          supabase_db.table("email_verification_tokens").insert(
              {
                  "user_id": user_id,
                  "code": code,
                  "expires_at": expires_at.isoformat(),
                  "used": False,
              }
          ).execute()
          print(f"✅ Token de vérification email créé dans Supabase (user_id={user_id})")
      except Exception as e:
          print(f"⚠️  Erreur création email_verification_tokens dans Supabase (register): {e}")

      _send_verification_email(email, code)

      return jsonify({
          "ok": True,
          "requires_verification": True,
          "message": "Un code de vérification a été envoyé à votre adresse email. Veuillez le saisir pour activer votre compte."
      }), 201

  except Exception as e:
      print(f"❌ Error in /auth/register: {e}")
      return jsonify({
          "ok": False,
          "error": "SERVER_ERROR",
          "message": "Erreur serveur lors de la création du compte"
      }), 500


@auth_bp.route("/login", methods=["POST"])
def login():
  """
  Connexion d'un utilisateur.
  Body attendu (JSON) :
  {
    "email": "user@example.com",
    "password": "motdepasse"
  }
  """
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip().lower()
  password = data.get("password") or ""

  if not email or not password:
      return jsonify({
          "ok": False,
          "error": "INVALID_INPUT",
          "message": "email et password sont requis"
      }), 400

  try:
      if supabase_db is None:
          print("❌ Supabase DB non configuré pour /auth/login")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Configuration Supabase manquante côté serveur"
          }), 500

      # Source de vérité : Supabase DB uniquement
      user = None
      try:
          resp = supabase_db.table("users").select(
              "id, email, password_hash, role, is_verified"
          ).eq("email", email).limit(1).execute()
          if resp.data:
              user = resp.data[0]
      except Exception as e:
          print(f"⚠️  Erreur lecture user Supabase (login): {e}")

      if not user or not check_password_hash(user["password_hash"], password):
          return jsonify({
              "ok": False,
              "error": "INVALID_CREDENTIALS",
              "message": "Email ou mot de passe incorrect"
          }), 401
      
      if not user.get("is_verified"):
          return jsonify({
              "ok": False,
              "error": "EMAIL_NOT_VERIFIED",
              "message": "Veuillez vérifier votre email avant de vous connecter"
          }), 403

      token = _create_access_token(user["id"], user["role"], user["email"])
      return jsonify({
          "ok": True,
          "user": {
              "id": user["id"],
              "email": user["email"],
              "role": user["role"],
          },
          "token": token,
      }), 200

  except Exception as e:
      print(f"❌ Error in /auth/login: {e}")
      return jsonify({
          "ok": False,
          "error": "SERVER_ERROR",
          "message": "Erreur serveur lors de la connexion"
      }), 500


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
  """
  Vérifie un code de confirmation envoyé par email.
  Body attendu (JSON) :
  {
    "email": "user@example.com",
    "code": "123456"
  }
  """
  data = request.get_json(silent=True) or {}
  email = (data.get("email") or "").strip().lower()
  code = (data.get("code") or "").strip()

  if not email or not code:
      return jsonify({
          "ok": False,
          "error": "INVALID_INPUT",
          "message": "email et code sont requis"
      }), 400

  try:
      if supabase_db is None:
          print("❌ Supabase DB non configuré pour /auth/verify-email")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Configuration Supabase manquante côté serveur"
          }), 500

      # 1) Retrouver l'utilisateur par email
      resp_user = supabase_db.table("users").select("id").eq("email", email).limit(1).execute()
      user = resp_user.data[0] if resp_user.data else None
      if not user:
          return jsonify({
              "ok": False,
              "error": "UNKNOWN_EMAIL",
              "message": "Aucun compte trouvé pour cet email"
          }), 404

      user_id = user["id"]

      # 2) Récupérer le dernier token correspondant à ce code
      resp_token = (
          supabase_db.table("email_verification_tokens")
          .select("id, code, expires_at, used")
          .eq("user_id", user_id)
          .eq("code", code)
          .order("id", desc=True)
          .limit(1)
          .execute()
      )
      token_row = resp_token.data[0] if resp_token.data else None

      if not token_row:
          return jsonify({
              "ok": False,
              "error": "INVALID_CODE",
              "message": "Code de vérification invalide"
          }), 400

      if token_row.get("used"):
          return jsonify({
              "ok": False,
              "error": "CODE_ALREADY_USED",
              "message": "Ce code a déjà été utilisé"
          }), 400

      expires_at_raw = token_row.get("expires_at")
      expires_at_dt = None
      if isinstance(expires_at_raw, datetime):
          expires_at_dt = expires_at_raw
      elif isinstance(expires_at_raw, str):
          try:
              # Normaliser les formats ISO8601 possibles (avec ou sans 'Z')
              cleaned = expires_at_raw.strip()
              if cleaned.endswith("Z"):
                  cleaned = cleaned.replace("Z", "+00:00")
              expires_at_dt = datetime.fromisoformat(cleaned)
          except Exception:
              expires_at_dt = None

      if expires_at_dt:
          # Uniformiser en UTC et éviter la comparaison naive/aware
          if expires_at_dt.tzinfo is None:
              expires_at_dt = expires_at_dt.replace(tzinfo=timezone.utc)
          now_utc = datetime.now(timezone.utc)
          if expires_at_dt <= now_utc:
              return jsonify({
                  "ok": False,
                  "error": "CODE_EXPIRED",
                  "message": "Ce code de vérification a expiré"
              }), 400

      # 3) Marquer le token comme utilisé et l'utilisateur comme vérifié
      try:
          supabase_db.table("email_verification_tokens").update(
              {"used": True}
          ).eq("id", token_row["id"]).execute()

          supabase_db.table("users").update(
              {"is_verified": True}
          ).eq("id", user_id).execute()

          print(f"✅ User {email} marqué comme vérifié dans Supabase (verify-email)")
      except Exception as e:
          print(f"⚠️  Erreur lors de la MAJ de vérification email dans Supabase: {e}")

      return jsonify({
          "ok": True,
          "message": "Votre email a été vérifié. Vous pouvez maintenant vous connecter."
      }), 200

  except Exception as e:
      print(f"❌ Error in /auth/verify-email: {e}")
      return jsonify({
          "ok": False,
          "error": "SERVER_ERROR",
          "message": "Erreur serveur lors de la vérification de l'email"
      }), 500


@auth_bp.route("/me", methods=["GET"])
def me():
  """
  Retourne les informations de l'utilisateur courant à partir du token JWT.
  Header attendu :
    Authorization: Bearer <token>
  """
  payload, error = _decode_token_from_request()
  if error:
      message, status_code = error
      return jsonify({
          "ok": False,
          "error": "UNAUTHORIZED",
          "message": message,
      }), status_code

  user_id = payload.get("sub")
  role = payload.get("role")
  email = (payload.get("email") or "").strip().lower()
  email = payload.get("email")

  if not user_id or not role or not email:
      return jsonify({
          "ok": False,
          "error": "INVALID_TOKEN",
          "message": "Token invalide"
      }), 401

  return jsonify({
      "ok": True,
      "user": {
          "id": user_id,
          "email": email,
          "role": role,
      }
  }), 200


@auth_bp.route("/me/candidate/progress", methods=["GET"])
def candidate_progress():
  """
  Retourne la progression du candidat connecté (étape atteinte + IDs).
  Utilise l'email du user pour retrouver le dernier candidat créé avec cet email.
  """
  payload, error = _decode_token_from_request()
  if error:
      message, status_code = error
      return jsonify({
          "ok": False,
          "error": "UNAUTHORIZED",
          "message": message,
      }), status_code

  user_id = payload.get("sub")
  role = payload.get("role")

  if role != "candidat" or not user_id:
      return jsonify({
          "ok": False,
          "error": "FORBIDDEN",
          "message": "Seuls les comptes candidats peuvent accéder à cette ressource"
      }), 403

  try:
      if supabase_db is None:
          print("❌ Supabase DB non configuré pour /auth/me/candidate/progress")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Configuration Supabase manquante côté serveur"
          }), 500

      # Vérifier si ce user_id est lié à une ligne candidat
      resp_cand = (
          supabase_db.table("candidates")
          .select("id, candidate_uuid, id_agent")
          .eq("user_id", user_id)
          .order("id", desc=True)
          .limit(1)
          .execute()
      )
      candidate = resp_cand.data[0] if resp_cand.data else None

      if not candidate:
          return jsonify({
              "ok": True,
              "candidate": None,
              "max_step": 1
          }), 200

      db_candidate_id = candidate["id"]
      candidate_uuid = candidate.get("candidate_uuid") or candidate.get("id_agent") or str(db_candidate_id)

      # Vérifier s'il existe au moins un CV corrigé pour ce candidat (nouveau schéma: fichiers_versions)
      resp_cv = (
          supabase_db.table("fichiers_versions")
          .select("corrected_pdf_minio_url")
          .eq("candidate_id", db_candidate_id)
          .execute()
      )
      has_corrected_cv = any(
          row.get("corrected_pdf_minio_url") for row in (resp_cv.data or [])
      )

      has_talentcard = True  # existence de la ligne candidates

      # Mapper sur ton système d'étapes (RequireStep)
      # 1 : rien, 4 : Talent Card ok, 6 : CV corrigé ok
      if has_corrected_cv:
          max_step = 6
      elif has_talentcard:
          max_step = 4
      else:
          max_step = 1

      return jsonify({
          "ok": True,
          "candidate": {
              "db_candidate_id": db_candidate_id,
              "candidate_id": candidate_uuid,
              "has_talentcard": has_talentcard,
              "has_corrected_cv": has_corrected_cv,
          },
          "max_step": max_step,
      }), 200

  except Exception as e:
      print(f"❌ Error in /auth/me/candidate/progress: {e}")
      print(f"❌ User ID: {user_id}")
      print(f"❌ Role: {role}")
      print(f"❌ Error in /auth/me/candidate/progress: {e}")
      return jsonify({
          "ok": False,
          "error": "SERVER_ERROR",
          "message": "Erreur serveur lors de la récupération de la progression"
      }), 500


@auth_bp.route("/me/files", methods=["GET"])
def my_generated_files():
  """
  Retourne la liste des fichiers générés pour le candidat connecté
  (Talent Card, CV corrigé, Portfolio long, Portfolio one-page).
  """
  payload, error = _decode_token_from_request()
  if error:
      message, status_code = error
      return jsonify({
          "ok": False,
          "error": "UNAUTHORIZED",
          "message": message,
      }), status_code

  user_id = payload.get("sub")
  role = payload.get("role")

  if role != "candidat" or not user_id:
      return jsonify({
          "ok": False,
          "error": "FORBIDDEN",
          "message": "Seuls les comptes candidats peuvent accéder à cette ressource"
      }), 403

  try:
      if supabase_db is None:
          print("❌ Supabase DB non configuré pour /auth/me/files")
          return jsonify({
              "ok": False,
              "error": "SERVER_ERROR",
              "message": "Configuration Supabase manquante côté serveur"
          }), 500

      # Vérifier uniquement si ce user_id est lié à une ligne candidat (pas de comparaison email).
      resp_cand = (
          supabase_db.table("candidates")
          .select("id, candidate_uuid, nom, prenom, id_agent")
          .eq("user_id", user_id)
          .order("id", desc=True)
          .limit(1)
          .execute()
      )
      candidate = resp_cand.data[0] if resp_cand.data else None

      if not candidate:
          return jsonify({
              "ok": True,
              "candidate": None,
              "files": []
          }), 200

      db_candidate_id = candidate["id"]
      candidate_uuid = candidate.get("candidate_uuid") or str(candidate["id"])
      nom = candidate.get("nom") or ""
      prenom = candidate.get("prenom") or ""
      id_agent = candidate.get("id_agent")

      # Talent Card PDF principale : fichiers_versions.talent_card_url
      resp_tc = (
          supabase_db.table("fichiers_versions")
          .select("talent_card_url")
          .eq("candidate_id", db_candidate_id)
          .eq("candidate_uuid", candidate_uuid)
          .order("id", desc=True)
          .limit(1)
          .execute()
      )
      row_tc = resp_tc.data[0] if resp_tc.data else None
      has_talentcard_pdf = bool(row_tc and row_tc.get("talent_card_url"))

      # Fallback : si la colonne talent_card_url n'est pas renseignée,
      # on vérifie directement dans Supabase Storage si un PDF existe.
      if not has_talentcard_pdf:
          try:
              storage = get_supabase_storage()
              if storage and storage.client:
                  prefix = get_candidate_minio_prefix(db_candidate_id)
                  has_talentcard_pdf = _talentcard_pdf_exists(
                      storage, prefix, candidate_uuid, id_agent
                  )
          except Exception as e:
              print(f"⚠️ [Auth] Vérification Talent Card Supabase Storage: {e}")

      resp_cv = (
          supabase_db.table("fichiers_versions")
          .select("corrected_pdf_minio_url")
          .eq("candidate_id", db_candidate_id)
          .execute()
      )
      has_corrected_cv = any(
          row.get("corrected_pdf_minio_url") for row in (resp_cv.data or [])
      )

      # Vérifier si les PDF portfolio existent dans Supabase Storage
      has_portfolio_long = False
      has_portfolio_one_page = False
      try:
        storage = get_supabase_storage()
        if storage and storage.client:
          prefix = get_candidate_minio_prefix(db_candidate_id)
          has_portfolio_long = _portfolio_pdf_exists(
            storage, prefix, candidate_uuid, "long"
          )
          has_portfolio_one_page = _portfolio_pdf_exists(
            storage, prefix, candidate_uuid, "one-page"
          )
      except Exception as e:
        print(f"⚠️ [Auth] Vérification portfolio Supabase: {e}")

      # max_step pour que le front redirige vers la bonne étape (1, 4, 6, etc.)
      has_talentcard = has_talentcard_pdf
      if has_corrected_cv:
        max_step = 6
      elif has_talentcard:
        max_step = 4
      else:
        max_step = 1

      # URLs relatives pour que le front puisse les préfixer avec API_URL
      base = os.getenv("RECRUIT_BASE_URL") or ""  # vide = chemins relatifs
      if not base and hasattr(request, "url_root"):
          base = (request.url_root or "").rstrip("/")
      prefix = base.rstrip("/") if base else ""

      def url(path):
          return f"{prefix}{path}" if prefix else path

      files = []

      if has_talentcard_pdf:
          files.append({
              "type": "talent_card",
              "label": "Talent Card (PDF)",
              "previewUrl": url(f"/talentcard/{db_candidate_id}/preview"),
              "downloadUrl": url(f"/talentcard/{db_candidate_id}/download"),
              "available": True,
          })
      else:
          files.append({
              "type": "talent_card",
              "label": "Talent Card (PDF)",
              "previewUrl": url(f"/talentcard/{db_candidate_id}/preview"),
              "downloadUrl": url(f"/talentcard/{db_candidate_id}/download"),
              "available": False,
          })

      files.append({
          "type": "cv",
          "label": "CV corrigé (PDF)",
          "previewUrl": url(f"/correctedcv/{candidate_uuid}/preview?db_candidate_id={db_candidate_id}"),
          "downloadUrl": url(f"/correctedcv/{candidate_uuid}/download?db_candidate_id={db_candidate_id}"),
          "available": has_corrected_cv,
      })

      files.append({
          "type": "portfolio_long",
          "label": "Portfolio (version longue)",
          "previewUrl": url(f"/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_candidate_id}&version=long"),
          "downloadUrl": url(f"/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_candidate_id}&version=long&download=1"),
          "available": has_portfolio_long,
      })

      files.append({
          "type": "portfolio_one_page",
          "label": "Portfolio (one-page)",
          "previewUrl": url(f"/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_candidate_id}&version=one-page"),
          "downloadUrl": url(f"/portfolio/{candidate_uuid}/pdf?db_candidate_id={db_candidate_id}&version=one-page&download=1"),
          "available": has_portfolio_one_page,
      })

      return jsonify({
          "ok": True,
          "candidate": {
              "db_candidate_id": db_candidate_id,
              "candidate_uuid": candidate_uuid,
              "nom": nom,
              "prenom": prenom,
          },
          "max_step": max_step,
          "files": files,
      }), 200

  except Exception as e:
      print(f"❌ Error in /auth/me/files: {e}")
      return jsonify({
          "ok": False,
          "error": "SERVER_ERROR",
          "message": "Erreur serveur lors de la récupération des fichiers",
      }), 500









from flask import Blueprint, request, jsonify, redirect
import os
import json
import secrets
import base64
import hmac
import hashlib
import requests
from datetime import datetime, timedelta
from urllib.parse import urlencode

oauth_bp = Blueprint("oauth", __name__, url_prefix="/api/auth")

ALLOWED_PROVIDERS = {"google", "github", "linkedin"}
ALLOWED_USER_TYPES = {"candidate", "recruiter"}
ALLOWED_INTENTS = {"signup", "login"}
ALLOWED_RETURN_PATHS = {
    "/",
    "/signup",
    "/recruteur",
    "/signup/candidat",
    "/signup/recruteur",
    "/mes-fichiers",
}


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _default_return_path(user_type: str, intent: str) -> str:
    if user_type == "recruiter":
        return "/recruteur" if intent == "login" else "/signup/recruteur"
    return "/" if intent == "login" else "/signup/candidat"


def _sanitize_return_path(path: str | None, user_type: str, intent: str) -> str:
    p = (path or "").strip()
    if p in ALLOWED_RETURN_PATHS:
        return p
    return _default_return_path(user_type, intent)


def _state_secret() -> bytes:
    return _env("JWT_SECRET", "change-me").encode("utf-8")


def _encode_state(payload: dict) -> str:
    envelope = dict(payload)
    envelope["exp"] = int((datetime.utcnow() + timedelta(minutes=15)).timestamp())
    envelope["nonce"] = secrets.token_urlsafe(12)
    raw = json.dumps(envelope, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    raw_b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    sig = hmac.new(_state_secret(), raw_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{raw_b64}.{sig}"


def _decode_state(token: str) -> dict | None:
    if not token or "." not in token:
        return None
    try:
        raw_b64, sig = token.rsplit(".", 1)
        expected = hmac.new(_state_secret(), raw_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        padded = raw_b64 + "=" * ((4 - len(raw_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(datetime.utcnow().timestamp()):
            return None
        return payload
    except Exception:
        return None


def _encode_session_payload(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _frontend_base_url() -> str:
    return (_env("OAUTH_FRONTEND_BASE_URL") or "http://localhost:3000").rstrip("/")


def _redirect_uri(provider: str) -> str:
    specific = _env(f"OAUTH_{provider.upper()}_REDIRECT_URI")
    if specific:
        return specific
    return f"{request.url_root.rstrip('/')}/api/auth/oauth/{provider}/callback"


def _credentials(provider: str) -> tuple[str, str]:
    p = provider.upper()
    client_id = _env(f"OAUTH_{p}_CLIENT_ID")
    client_secret = _env(f"OAUTH_{p}_CLIENT_SECRET")
    return client_id, client_secret


def _authorize_url(provider: str, state_token: str) -> tuple[bool, str]:
    client_id, _ = _credentials(provider)
    if not client_id:
        return False, "OAuth client_id missing"

    redirect_uri = _redirect_uri(provider)

    if provider == "google":
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state_token,
            "prompt": "select_account",
        }
        return True, f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    if provider == "github":
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
            "state": state_token,
        }
        return True, f"https://github.com/login/oauth/authorize?{urlencode(params)}"

    if provider == "linkedin":
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "openid profile email",
            "state": state_token,
        }
        return True, f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"

    return False, "Unsupported provider"


def _http_error_message(resp: requests.Response, fallback: str) -> str:
    try:
        data = resp.json()
        return data.get("error_description") or data.get("error") or data.get("message") or fallback
    except Exception:
        return fallback


def _exchange_code(provider: str, code: str, redirect_uri: str) -> tuple[bool, str]:
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        return False, f"Missing OAuth credentials for {provider}"

    try:
        if provider == "google":
            resp = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=20,
            )
        elif provider == "github":
            resp = requests.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                },
                timeout=20,
            )
        elif provider == "linkedin":
            resp = requests.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                timeout=20,
            )
        else:
            return False, "Unsupported provider"

        if resp.status_code >= 400:
            return False, _http_error_message(resp, "OAuth token exchange failed")

        data = resp.json()
        token = data.get("access_token")
        if not token:
            return False, "No access_token in OAuth response"
        return True, token
    except Exception as exc:
        return False, f"OAuth exchange failed: {exc}"


def _split_name(full_name: str) -> tuple[str, str]:
    n = (full_name or "").strip()
    if not n:
        return "", ""
    parts = n.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _fetch_profile(provider: str, access_token: str) -> tuple[bool, dict | str]:
    try:
        if provider == "google":
            resp = requests.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=20,
            )
            if resp.status_code >= 400:
                return False, _http_error_message(resp, "Cannot fetch Google profile")
            data = resp.json()
            first_name = (data.get("given_name") or "").strip()
            last_name = (data.get("family_name") or "").strip()
            full_name = (data.get("name") or "").strip()
            if not (first_name or last_name):
                first_name, last_name = _split_name(full_name)
            profile_url = (data.get("profile") or "").strip() or None
            if not profile_url and data.get("sub"):
                profile_url = f"https://profiles.google.com/{data.get('sub')}"
            return True, {
                "provider": "google",
                "email": (data.get("email") or "").strip().lower(),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name or f"{first_name} {last_name}".strip(),
                "profile_url": profile_url,
                "provider_user_id": str(data.get("sub") or ""),
                "username": "",
                "avatar_url": (data.get("picture") or "").strip() or None,
            }

        if provider == "linkedin":
            resp = requests.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=20,
            )
            if resp.status_code >= 400:
                return False, _http_error_message(resp, "Cannot fetch LinkedIn profile")
            data = resp.json()
            first_name = (data.get("given_name") or "").strip()
            last_name = (data.get("family_name") or "").strip()
            full_name = (data.get("name") or "").strip()
            if not (first_name or last_name):
                first_name, last_name = _split_name(full_name)
            profile_url = (data.get("profile") or "").strip() or None
            provider_user_id = str(data.get("sub") or "")
            if not profile_url and provider_user_id:
                profile_url = f"https://www.linkedin.com/in/{provider_user_id}"
            return True, {
                "provider": "linkedin",
                "email": (data.get("email") or "").strip().lower(),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name or f"{first_name} {last_name}".strip(),
                "profile_url": profile_url,
                "provider_user_id": provider_user_id,
                "username": "",
                "avatar_url": (data.get("picture") or "").strip() or None,
            }

        if provider == "github":
            user_resp = requests.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=20,
            )
            if user_resp.status_code >= 400:
                return False, _http_error_message(user_resp, "Cannot fetch GitHub profile")

            user_data = user_resp.json()
            email = (user_data.get("email") or "").strip().lower()
            if not email:
                emails_resp = requests.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github+json",
                    },
                    timeout=20,
                )
                if emails_resp.status_code < 400:
                    emails = emails_resp.json() or []
                    primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
                    fallback = next((e for e in emails if e.get("verified")), None) or (emails[0] if emails else None)
                    email = ((primary or fallback or {}).get("email") or "").strip().lower()

            full_name = (user_data.get("name") or "").strip()
            username = (user_data.get("login") or "").strip()
            first_name, last_name = _split_name(full_name or username)
            profile_url = (user_data.get("html_url") or "").strip() or None
            if not profile_url and username:
                profile_url = f"https://github.com/{username}"

            return True, {
                "provider": "github",
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name or username,
                "profile_url": profile_url,
                "provider_user_id": str(user_data.get("id") or ""),
                "username": username,
                "avatar_url": (user_data.get("avatar_url") or "").strip() or None,
            }

        return False, "Unsupported provider"
    except Exception as exc:
        return False, f"Profile fetch failed: {exc}"


def _oauth_error_redirect(return_path: str, message: str):
    fragment = urlencode({"oauth_error": (message or "OAuth error").strip()})
    return redirect(f"{_frontend_base_url()}{return_path}#{fragment}")


def issue_app_session(profile: dict, context: dict) -> tuple[bool, dict | str]:
    """
    Crée / retrouve un utilisateur applicatif à partir du profil OAuth
    puis retourne une "session" pour le front.
    """
    email = (profile.get("email") or "").strip().lower()
    if not email:
        return False, "Le fournisseur OAuth n'a pas renvoyé d'email vérifié"

    provider = (profile.get("provider") or "").strip().lower()
    user_type = (context.get("user_type") or "candidate").strip().lower()
    intent = (context.get("intent") or "signup").strip().lower()

    # Mapping user_type (côté OAuth) -> role (colonne dans la table users)
    role = "candidat" if user_type == "candidate" else "recruteur"

    try:
        if supabase_db is None:
            print("❌ Supabase DB non configuré pour issue_app_session (OAuth)")
            return False, "Erreur serveur lors de la connexion OAuth"

        # Source de vérité : Supabase uniquement
        created = False
        user_id = None
        password_hash = None

        resp_user = (
            supabase_db.table("users")
            .select("id, email, role")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        user = resp_user.data[0] if resp_user.data else None

        if not user:
            # Si aucun utilisateur n'existe pour cet email, on le crée
            # quelle que soit la valeur de intent (login ou signup).
            # Il se connectera uniquement via OAuth.
            random_password = secrets.token_urlsafe(32)
            password_hash = generate_password_hash(random_password)

            resp_insert = supabase_db.table("users").insert(
                {
                    "email": email,
                    "password_hash": password_hash,
                    "role": role,
                    "is_verified": True,
                }
            ).execute()
            if not resp_insert.data:
                print("❌ Insertion Supabase users sans retour de données (OAuth)")
                return False, "Erreur serveur lors de la connexion OAuth"
            user_id = resp_insert.data[0]["id"]
            created = True
        else:
            user_id = user["id"]


        token = _create_access_token(user_id, role, email)
        expires_at = int((datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS)).timestamp())

        session_payload = {
            "token": token,
            "expires_at": expires_at,
            "user_type": user_type,
            "user": {
                "id": user_id,
                "email": email,
                "role": role,
                "first_name": profile.get("first_name") or "",
                "last_name": profile.get("last_name") or "",
                "full_name": profile.get("full_name") or "",
                "avatar_url": profile.get("avatar_url"),
                "provider": provider,
                "provider_user_id": profile.get("provider_user_id"),
                "username": profile.get("username") or "",
                "profile_url": profile.get("profile_url"),
                "created_via_oauth": created,
            },
        }

        return True, session_payload

    except Exception as e:
        print(f"❌ Error in issue_app_session: {e}")
        return False, "Erreur serveur lors de la connexion OAuth"


@oauth_bp.route("/oauth/<provider>/start", methods=["GET"])
def oauth_start(provider):
    provider = (provider or "").strip().lower()
    if provider not in ALLOWED_PROVIDERS:
        return jsonify({"error": "Unsupported provider"}), 400

    user_type = (request.args.get("user_type") or "candidate").strip().lower()
    intent = (request.args.get("intent") or "signup").strip().lower()
    if user_type not in ALLOWED_USER_TYPES:
        return jsonify({"error": "Invalid user_type"}), 400
    if intent not in ALLOWED_INTENTS:
        return jsonify({"error": "Invalid intent"}), 400

    return_path = _sanitize_return_path(request.args.get("return_path"), user_type, intent)
    client_id, client_secret = _credentials(provider)
    if not client_id or not client_secret:
        p = provider.upper()
        return jsonify({
            "error": f"Missing OAuth config for {provider}. Expected OAUTH_{p}_CLIENT_ID and OAUTH_{p}_CLIENT_SECRET"
        }), 500

    state_token = _encode_state({
        "provider": provider,
        "user_type": user_type,
        "intent": intent,
        "return_path": return_path,
    })
    ok, url_or_error = _authorize_url(provider, state_token)
    if not ok:
        return jsonify({"error": url_or_error}), 500
    return redirect(url_or_error, code=302)


@oauth_bp.route("/oauth/<provider>/callback", methods=["GET"])
def oauth_callback(provider):
    provider = (provider or "").strip().lower()
    if provider not in ALLOWED_PROVIDERS:
        return jsonify({"error": "Unsupported provider"}), 400

    decoded_state = _decode_state(request.args.get("state") or "")
    fallback_path = "/signup"
    if decoded_state:
        fallback_path = _sanitize_return_path(
            decoded_state.get("return_path"),
            decoded_state.get("user_type", "candidate"),
            decoded_state.get("intent", "signup"),
        )

    provider_error = request.args.get("error_description") or request.args.get("error")
    if provider_error:
        return _oauth_error_redirect(fallback_path, provider_error)

    if not decoded_state:
        return _oauth_error_redirect(fallback_path, "Invalid or expired OAuth state")

    if decoded_state.get("provider") != provider:
        return _oauth_error_redirect(fallback_path, "OAuth provider mismatch")

    code = request.args.get("code")
    if not code:
        return _oauth_error_redirect(fallback_path, "OAuth code missing")

    ok, token_or_error = _exchange_code(provider, code, _redirect_uri(provider))
    if not ok:
        return _oauth_error_redirect(fallback_path, token_or_error)

    ok, profile_or_error = _fetch_profile(provider, token_or_error)
    if not ok:
        return _oauth_error_redirect(fallback_path, profile_or_error)

    auth_ok, session_or_error = issue_app_session(profile_or_error, decoded_state)
    if not auth_ok:
        return _oauth_error_redirect(fallback_path, str(session_or_error))

    oauth_session = _encode_session_payload(session_or_error)
    return redirect(f"{_frontend_base_url()}{fallback_path}#oauth_session={oauth_session}", code=302)
