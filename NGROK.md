# Exposition via ngrok — Astreinte App

Permet de rendre l'application accessible depuis Internet sans serveur,
tant que votre ordinateur est allumé et ngrok tourne.

---

## 1. Installer ngrok

**Windows :**
```
winget install ngrok
```
ou télécharger l'exécutable sur https://ngrok.com/download et l'ajouter au PATH.

**Vérifier l'installation :**
```bash
ngrok version
```

---

## 2. Créer un compte et configurer l'authtoken

1. Créer un compte gratuit sur https://dashboard.ngrok.com/signup
2. Récupérer votre authtoken sur https://dashboard.ngrok.com/get-started/your-authtoken
3. Enregistrer le token :

```bash
ngrok config add-authtoken VOTRE_AUTHTOKEN
```

Cette commande crée le fichier de configuration ngrok automatiquement.
**À faire une seule fois.**

---

## 3. Lancer l'application publiquement

### Option A — Tunnel seul (si l'appli tourne déjà)
```bash
npm run tunnel
```

### Option B — Application + tunnel en même temps *(recommandé)*
```bash
npm install          # si pas encore fait
npm run dev:public
```

Les deux processus démarrent en parallèle dans le même terminal.

---

## 4. Récupérer l'URL publique

Une fois ngrok lancé, l'URL s'affiche dans le terminal :

```
Forwarding   https://xxxx-xx-xx-xxx-xx.ngrok-free.app -> http://localhost:3000
```

**Copier cette URL** et la partager. Elle change à chaque redémarrage de ngrok.

Pour voir l'URL à tout moment, ouvrir l'interface web locale de ngrok :
```
http://localhost:4040
```

---

## 5. Accéder au site depuis Internet

1. Ouvrir l'URL `https://xxxx.ngrok-free.app` sur n'importe quel appareil
2. La première visite affiche une page d'avertissement ngrok → cliquer **"Visit Site"**
3. La page de connexion de l'application s'affiche

---

## ⚠️ Points importants

| Point | Détail |
|---|---|
| **Accès public** | Toute personne avec l'URL peut tenter de se connecter |
| **Protection** | La page de connexion protège l'accès (identifiants requis) |
| **Disponibilité** | L'app n'est accessible que si votre PC est allumé et ngrok actif |
| **URL temporaire** | L'URL change à chaque redémarrage de ngrok (plan gratuit) |
| **Limite gratuite** | 1 tunnel simultané, sessions de 8h maximum |

---

## Commandes de référence

```bash
# Installer concurrently (une seule fois)
npm install

# Lancer app + tunnel
npm run dev:public

# Lancer le tunnel seul
npm run tunnel

# Voir l'interface ngrok
open http://localhost:4040
```
