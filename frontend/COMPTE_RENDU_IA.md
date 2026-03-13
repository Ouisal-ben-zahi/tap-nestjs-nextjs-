# Compte-Rendu — Dev IA (Agent Flask — 31.97.196.196)

**Date** : 13 mars 2026
**Projet** : TAP — Agent d'analyse CV
**Serveur** : 31.97.196.196:5002

---

## Problèmes identifiés

### 1. Templates PDF — Design catastrophique

**Constat** : Les PDFs générés (talent card, portfolio court, portfolio long) ont un design brut, illisible et incohérent avec le site tap-hr.com. Le rendu ressemble à du HTML brut sans CSS appliqué.

**Fichiers concernés** :
- `/root/TAP_new/TAP 2/frontend/src/talent card html/talent_card_template2.html`
- `/root/TAP_new/TAP 2/frontend/src/portfolio html/template_one_page2.html`
- `/root/TAP_new/TAP 2/frontend/src/portfolio html/portfolio_long_template.html`
- `/root/TAP_new/TAP 2/frontend/src/CV templates/CV_template_A4.html`

**Ce qui est attendu** :
- Design dark cohérent avec le site (fond #0a0a0a, accent #C1121F, font Inter)
- Talent card format compact type FIFA : photo + nom + stats visuelles + compétences en chips
- Portfolio : mise en page professionnelle, pas de texte brut
- PDF lisible et esthétique, prêt à être envoyé à un recruteur

**Action requise** : Refonte complète des 4 templates HTML. Les nouveaux templates seront fournis.

---

### 2. Photo candidat non extraite du CV

**Constat** : Le champ `image_minio_url` est **toujours null** après analyse du CV. L'agent ne sait pas extraire la photo du candidat depuis le PDF.

**Impact** : La talent card et le portfolio affichent une icône générique au lieu de la photo du candidat.

**Ce qui est attendu** :
- Détecter la présence d'une image/photo dans le PDF du CV (souvent en haut à gauche ou à droite)
- L'extraire, la redimensionner, et l'uploader dans MinIO/Supabase Storage
- Stocker l'URL dans `image_minio_url` du candidat

**Pistes techniques** :
- Utiliser `pdfplumber` ou `PyMuPDF (fitz)` pour extraire les images du PDF
- Filtrer par taille (> 50×50 px) pour éviter les logos/icônes
- Prendre la plus grande image en haut du document = très probablement la photo

---

### 3. CV amélioré non généré

**Constat** : Après upload d'un CV, l'agent génère la talent card et le portfolio, mais le **CV amélioré** (CV reformaté avec le template TAP) n'est jamais généré ou uploadé.

**Ce qui est attendu** :
- Après analyse du CV, générer un CV reformaté avec le template `CV_template_A4.html`
- L'uploader dans Supabase Storage au même emplacement que les autres fichiers
- Le rendre accessible dans l'interface "Mes Fichiers"

---

### 4. Portfolio court (1 page) et long — Pas toujours générés

**Constat** : Pour certains candidats, seule la talent card est générée. Le portfolio court et le portfolio long n'apparaissent pas dans Supabase Storage.

**Ce qui est attendu** :
- Chaque upload de CV doit produire **4 fichiers** systématiquement :
  1. Talent Card (PDF)
  2. Portfolio 1 page (PDF)
  3. Portfolio long (PDF multi-pages)
  4. CV amélioré (PDF A4)
- Si une étape échoue, logger l'erreur clairement et continuer les autres

---

### 5. Données extraites incomplètes

**Constat** : L'analyse IA ne remplit pas correctement tous les champs. Exemples observés :
- `nom` et `prenom` parfois inversés ou vides
- `skills` = liste vide alors que le CV contient des compétences
- `annees_experience` = null ou 0 pour des profils avec de l'expérience
- `soft_skills` = vide
- `experiences` = vide même quand le CV liste des expériences

**Ce qui est attendu** :
- Extraction fiable de : nom, prénom, titre, compétences (hard + soft), expériences, formations, langues
- Score de confiance sur chaque champ extrait
- Fallback intelligent : si un champ n'est pas trouvé, ne pas mettre de placeholder générique ("Compétence principale"), laisser vide

---

### 6. Erreur "Candidat X introuvable" dans les logs

**Log observé** :
```
[AI] Erreur 404 pour candidat 6: {"error": "Candidat 6 introuvable"}
```

**Cause** : L'agent Flask cherche le candidat dans sa base MySQL locale, mais le candidat a été créé dans Supabase (PostgreSQL) par le backend NestJS. Les deux bases ne sont pas synchronisées.

**Action requise** : L'agent doit utiliser le `existing_candidate_id` envoyé par le backend NestJS (maintenant corrigé et décommenté) et mettre à jour le candidat existant dans Supabase au lieu de chercher dans MySQL.

---

## Architecture rappel

```
Utilisateur → tap-hr.com (Next.js, port 3080)
                  ↓ /api/
              Backend NestJS (port 1102) — Supabase PostgreSQL + Storage
                  ↓ Fire-and-forget POST
              Agent Flask (31.97.196.196:5002) — Analyse IA
                  ↓ Upload résultats
              Supabase Storage (bucket: tap_files)
```

**Le backend NestJS envoie maintenant** :
- `file` : le PDF du CV
- `existing_candidate_id` : l'ID du candidat dans Supabase (integer)

**L'agent Flask doit** :
1. Recevoir le CV + `existing_candidate_id`
2. Analyser le CV (extraction texte + photo + données structurées)
3. Mettre à jour le candidat dans Supabase (pas créer un nouveau)
4. Générer les 4 PDFs (talent card, portfolio court, portfolio long, CV amélioré)
5. Uploader les 4 PDFs dans Supabase Storage
6. Le frontend les affiche automatiquement via les hooks `useCandidatTalentcardFiles()`, `useCandidatPortfolioPdfs()`

---

## Priorités

| # | Tâche | Priorité |
|---|-------|----------|
| 1 | Utiliser `existing_candidate_id` et Supabase (pas MySQL) | CRITIQUE |
| 2 | Générer les 4 PDFs systématiquement | CRITIQUE |
| 3 | Extraction photo du CV | HAUTE |
| 4 | Refonte templates (fournis séparément) | HAUTE |
| 5 | Extraction complète des données (skills, exp, etc.) | HAUTE |
| 6 | Logger clairement chaque étape de la pipeline | MOYENNE |

---

*Ce document résume les problèmes identifiés le 13/03/2026. Les corrections backend (NestJS) sont en production.*
