# Compte-Rendu — Dev Full-Stack (Backend NestJS + Frontend Next.js)

**Date** : 13 mars 2026
**Projet** : TAP — tap-hr.com
**Contexte** : Audit et corrections après déploiement

---

## Bugs critiques trouvés et corrigés

### 1. AuthModule cassé — Authentification JWT morte

**Fichier** : `backend/src/auth/auth.module.ts`

**Problème** : `PassportModule` n'était pas importé et `JwtStrategy` n'était pas dans les providers. Résultat : **toute l'auth JWT ne fonctionnait pas** — erreur "Unknown authentication strategy jwt" sur chaque route protégée.

**Correction appliquée** :
```typescript
imports: [
  PassportModule.register({ defaultStrategy: 'jwt' }),  // ← MANQUANT
  JwtModule.registerAsync({ ... }),
],
providers: [AuthService, JwtStrategy],  // ← JwtStrategy MANQUANT
exports: [JwtStrategy, PassportModule],  // ← exports MANQUANTS
```

**Règle** : Quand on utilise `@UseGuards(AuthGuard('jwt'))`, il FAUT que `PassportModule` soit importé et `JwtStrategy` enregistré comme provider dans le même module (ou exporté depuis un module parent).

---

### 2. jwt.strategy.ts — Mauvais champ retourné

**Fichier** : `backend/src/auth/jwt.strategy.ts`

**Problème** : La méthode `validate()` retournait `{ userId: payload.sub }` mais les controllers accédaient à `req.user.sub`. Résultat : **`req.user.sub` toujours undefined** → impossible d'identifier l'utilisateur connecté.

**Correction** :
```typescript
// AVANT (cassé)
return { userId: payload.sub, email: payload.email, role: payload.role };

// APRÈS (corrigé)
return { sub: payload.sub, email: payload.email, role: payload.role };
```

**Règle** : Les champs retournés par `validate()` = les champs accessibles dans `req.user`. Si les controllers utilisent `req.user.sub`, alors `validate()` doit retourner `{ sub: ... }`.

---

### 3. Upload CV — Crash si pas de profil candidat

**Fichier** : `backend/src/dashboard/dashboard.service.ts` — `uploadCandidateCv()`

**Problème** : Si un utilisateur avec `role: candidat` n'avait pas encore de ligne dans la table `candidates`, l'upload de CV renvoyait une erreur "Aucun profil candidat associé". L'utilisateur ne pouvait rien faire.

**Correction** : Ajout d'un helper `getOrCreateCandidate()` qui crée automatiquement un profil candidat (avec `id_agent`, `nom` = préfixe email, `categorie_profil` = 'Autres') si aucun n'existe.

**Règle** : Ne jamais bloquer un utilisateur légitime. Si un profil candidat est nécessaire, le créer automatiquement au premier besoin.

---

### 4. existing_candidate_id commenté — Doublons de candidats

**Fichier** : `backend/src/dashboard/dashboard.service.ts` — Fire-and-forget vers Flask

**Problème** : La ligne `form.append("existing_candidate_id", String(candidateId))` était **commentée**. L'agent Flask ne recevait jamais l'ID du candidat existant → il créait un nouveau candidat à chaque upload de CV → **doublons en base**.

**Correction** : Décommenter la ligne.

**Règle** : Ne jamais commenter du code fonctionnel sans raison documentée. Utiliser des feature flags ou des variables d'environnement si besoin de désactiver une fonctionnalité.

---

### 5. Portfolio API — Mismatch frontend/backend

**Fichier frontend** : `src/services/candidat.service.ts`

**Problème** : Le frontend attendait `{ portfolioPdfFiles: [...] }` mais l'API renvoyait `{ portfolioShort: [...], portfolioLong: [...] }` (deux tableaux séparés). Résultat : **les portfolios n'étaient jamais affichés**.

**Correction** : Le service frontend fusionne maintenant les deux tableaux :
```typescript
getPortfolioPdfFiles: () =>
  api.get('/dashboard/candidat/portfolio-pdf-files').then((r) => {
    const short = (r.data.portfolioShort || []).map(f => ({ ...f, type: 'short' }));
    const long = (r.data.portfolioLong || []).map(f => ({ ...f, type: 'long' }));
    return { portfolioPdfFiles: [...short, ...long] };
  }),
```

**Règle** : Documenter les contrats API (types de retour). Si le backend change la structure, le frontend doit être mis à jour en même temps.

---

### 6. PM2 — Mauvais chemin server.js

**Problème** : PM2 cherchait `server.js` dans `/root/tap-hr-next/tap-hr/server.js` mais Next.js standalone le met dans `/root/tap-hr-next/tap-hr/tap-hr/server.js` (sous-dossier du nom du projet). Résultat : **502 Bad Gateway permanent**.

**Correction** :
```bash
pm2 delete tap-hr-next
PORT=3080 pm2 start /root/tap-hr-next/tap-hr/tap-hr/server.js --name tap-hr-next --cwd /root/tap-hr-next/tap-hr/tap-hr
pm2 save
```

**Règle** : Après chaque build standalone Next.js, vérifier que le chemin PM2 pointe vers le bon `server.js`. La structure est : `.next/standalone/{project-name}/server.js`.

---

### 7. Fichiers statiques manquants

**Problème** : Le build standalone de Next.js ne copie PAS automatiquement `.next/static/` ni `public/` dans le dossier standalone. Il faut les copier manuellement.

**Règle pour chaque déploiement** :
```bash
# 1. Build
npm run build

# 2. Copier standalone
rsync -avz --delete .next/standalone/ VPS:/root/tap-hr-next/tap-hr/

# 3. Copier static (OBLIGATOIRE)
rsync -avz --delete .next/static/ VPS:/root/tap-hr-next/tap-hr/tap-hr/.next/static/

# 4. Copier public (OBLIGATOIRE)
rsync -avz --delete public/ VPS:/root/tap-hr-next/tap-hr/tap-hr/public/

# 5. Restart
pm2 restart tap-hr-next
```

---

## Résumé des règles à suivre

1. **Tester l'auth après chaque modification de `auth.module.ts`** — un curl sur une route protégée
2. **Ne jamais commenter du code sans ticket/PR associé**
3. **Documenter les contrats API** dans des types TypeScript partagés
4. **Script de déploiement** : créer un `deploy.sh` qui fait build + rsync standalone + rsync static + rsync public + pm2 restart
5. **Vérifier le VPS après chaque deploy** : `curl -s -o /dev/null -w '%{http_code}' https://tap-hr.com/` doit retourner 200

---

*Ce document résume les bugs trouvés le 13/03/2026. Toutes les corrections sont en production et poussées sur GitHub.*
