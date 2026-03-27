# Déploiement Staging OVH (Lien test)

Objectif: publier une version test accessible par URL, avec la même interface que la prod.

## 1. Pré-requis OVH

1. Un VPS OVH (Ubuntu 22.04 recommandé).
2. Un sous-domaine DNS, ex: `staging.plachet.be`, pointé vers l'IP du VPS.
3. Un projet Supabase dédié staging (séparé de prod).

## 2. Installation serveur (une seule fois)

```bash
sudo apt update
sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

## 3. Déployer le code

```bash
sudo mkdir -p /var/www/plachet-staging
sudo chown -R $USER:$USER /var/www/plachet-staging
git clone <TON_REPO_GIT> /var/www/plachet-staging/current
cd /var/www/plachet-staging/current
```

## 4. Variables d'environnement staging

```bash
cp deploy/staging.env.example .env.local
nano .env.local
```

À compléter absolument:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `SESSION_SECRET` (fort)
- `APP_URL=https://staging.plachet.be`

## 5. Build + démarrage app

```bash
cd /var/www/plachet-staging/current
./deploy/scripts/deploy_staging.sh
```

## 6. Config Nginx

```bash
sudo cp /var/www/plachet-staging/current/deploy/nginx/plachet-staging.conf /etc/nginx/sites-available/plachet-staging.conf
sudo ln -s /etc/nginx/sites-available/plachet-staging.conf /etc/nginx/sites-enabled/plachet-staging.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d staging.plachet.be
```

## 8. Vérifications

```bash
curl -fsS http://127.0.0.1:3000/healthz
curl -I https://staging.plachet.be
pm2 status
pm2 logs plachet-staging --lines 100
```

## 9. Lien test à donner

- `https://staging.plachet.be/admin`

Le testeur aura la même interface que la prod si tu déploies la même branche.

## 10. Mise à jour future (nouvelle version)

```bash
cd /var/www/plachet-staging/current
git pull
./deploy/scripts/deploy_staging.sh
```

