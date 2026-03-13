# Démarrer le projet (local ou VPS)

## En local

1. **Backend** (dossier `backend`)  
   - `.env` : `PORT=3112` (déjà configuré)  
   - Lancer : `npm run start:dev` ou `npm run build` puis `npm run start:prod`  
   - API : http://localhost:3112

2. **Frontend** (dossier `frontend`)  
   - `.env.local` : `NEXT_PUBLIC_API_URL=http://localhost:3112`  
   - Lancer : `npm run dev`  
   - App : http://localhost:3111

---

## Sur le VPS (http://168.231.82.55/)

1. **Variables d’environnement**
   - **Frontend** (avant `npm run build`) :  
     `NEXT_PUBLIC_API_URL=http://168.231.82.55/api`
   - **Backend** : `PORT=3112` (inchangé)

2. **Lancer les services**
   - Backend : `cd backend && npm run build && npm run start:prod` (ou PM2)
   - Frontend : `cd frontend && npm run build && npm run start` (port 3111, ou PM2)

3. **Nginx** (recommandé pour écouter sur le port 80)  
   - Utiliser le fichier `nginx-vps.example.conf` comme base.  
   - Le front est servi sur `/`, l’API sur `/api` (proxy vers le backend 3112).  
   - Après config : `sudo nginx -t && sudo systemctl reload nginx`

Sans Nginx, l’app est accessible en direct sur :
- http://168.231.82.55:3111 (frontend)  
- http://168.231.82.55:3112 (backend)

Avec Nginx en place, tout est servi via http://168.231.82.55/ (port 80).
