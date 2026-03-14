# Guide de déploiement — Astreinte App

## Prérequis sur le serveur

```bash
# Ubuntu/Debian — Docker + Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # se déconnecter/reconnecter ensuite
```

---

## 1. Premier déploiement

### 1.1 Copier le projet sur le serveur

```bash
# Option A — depuis Git
git clone https://github.com/VOTRE_REPO/astreinte-app.git
cd astreinte-app

# Option B — depuis votre machine locale (scp)
scp -r "Astreinte V2/" user@IP_SERVEUR:/home/user/astreinte-app
ssh user@IP_SERVEUR
cd astreinte-app
```

### 1.2 Créer le dossier SSL (vide pour l'instant)

```bash
mkdir -p nginx/ssl
```

### 1.3 Démarrer en HTTP d'abord

```bash
# Utilise nginx.conf (HTTP uniquement)
docker compose up -d --build
```

L'application est maintenant accessible sur `http://IP_SERVEUR`.

---

## 2. Activer HTTPS avec Let's Encrypt (si domaine disponible)

### 2.1 Pointer votre domaine vers l'IP du serveur

Chez votre registrar : créer un enregistrement `A` pointant vers l'IP du serveur.
Attendre la propagation DNS (quelques minutes à 24h).

### 2.2 Obtenir le certificat

```bash
# Remplacer TON_DOMAINE.COM par votre domaine réel
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d TON_DOMAINE.COM -d www.TON_DOMAINE.COM \
  --email admin@TON_DOMAINE.COM \
  --agree-tos --no-eff-email
```

### 2.3 Passer à la config HTTPS

```bash
# Remplacer TON_DOMAINE.COM dans le fichier SSL
sed -i 's/TON_DOMAINE.COM/votre-vrai-domaine.com/g' nginx/nginx-ssl.conf

# Activer la config SSL
cp nginx/nginx-ssl.conf nginx/nginx.conf

# Redémarrer Nginx
docker compose restart nginx
```

L'application est maintenant accessible sur `https://TON_DOMAINE.COM` avec redirection HTTP → HTTPS automatique.

---

## 3. Mise à jour de l'application

```bash
# 1. Récupérer les nouvelles sources
git pull                          # si via Git
# ou re-copier les fichiers modifiés via scp

# 2. Reconstruire et redémarrer (zéro downtime ~30s)
docker compose up -d --build astreinte

# 3. Vérifier que tout fonctionne
docker compose ps
docker compose logs astreinte --tail=20
```

---

## 4. Commandes utiles

```bash
# Voir l'état des conteneurs
docker compose ps

# Voir les logs en temps réel
docker compose logs -f

# Redémarrer un service
docker compose restart astreinte
docker compose restart nginx

# Arrêter tout
docker compose down

# Arrêter et supprimer les volumes
docker compose down -v
```

---

## 5. Structure des fichiers générés

```
astreinte-app/
├── Dockerfile            ← build de l'app Next.js
├── docker-compose.yml    ← orchestration des services
├── .dockerignore         ← fichiers exclus du build
├── nginx/
│   ├── nginx.conf        ← config active (HTTP ou HTTPS)
│   ├── nginx-ssl.conf    ← config HTTPS (à activer après cert)
│   └── ssl/              ← certificats Let's Encrypt (auto-générés)
└── DEPLOY.md             ← ce guide
```

---

## 6. Sécurité minimale

```bash
# Pare-feu : n'ouvrir que les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Le port 3000 (Node.js) N'est PAS exposé publiquement
# Il est uniquement accessible en interne par Nginx via Docker network
```

---

## 7. Renouvellement automatique du certificat

Le service `certbot` dans `docker-compose.yml` vérifie et renouvelle automatiquement le certificat toutes les 12 heures. Aucune action manuelle nécessaire.

Pour forcer un renouvellement :
```bash
docker compose run --rm certbot renew --force-renewal
docker compose restart nginx
```
