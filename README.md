# Fallah — فلاّح

Boutique en ligne qui relie les clients directement aux agriculteurs : produits frais
cueillis du jour, commande en quelques clics, **confirmation par téléphone**, puis livraison
et **paiement en espèces à la remise**.

Site bilingue **arabe (RTL, par défaut)** / **français (LTR)**, bascule instantanée depuis l'en-tête.

---

## Parcours client

1. **Choisir un produit** dans le catalogue (recherche + filtres par catégorie).
2. **Choisir la quantité** en kilos — ou à la pièce / au litre / au plateau selon le produit,
   avec un pas de vente et un minimum propres à chaque article.
3. **Laisser un nom, un téléphone et une adresse** (aucun compte, aucun paiement en ligne).
4. **Attendre l'appel** du vendeur qui confirme la commande et l'horaire.
5. **Livraison** et paiement en espèces.

Le client peut suivre l'état de sa commande sur `/track.html` avec son numéro de commande
(`FLH-AAAAMMJJ-NNN`) et son téléphone.

## Parcours vendeur

`/admin.html` — protégé par mot de passe :

- toutes les commandes, filtrées par statut, avec compteurs et chiffre livré ;
- téléphone du client cliquable (`tel:`) pour l'appel de confirmation ;
- avancement en un clic : *en attente → confirmée → en préparation → en route → livrée* ;
- annulation (le stock est automatiquement restitué) ;
- édition des **prix**, du **stock** et de la **mise en vente** de chaque produit.

---

## Démarrer

```bash
npm start          # http://localhost:3000
```

**Aucune dépendance à installer** : le serveur n'utilise que Node (HTTP natif + `node:sqlite`).
Node **24 ou plus récent** est requis : c'est à partir de là que `node:sqlite` fonctionne
sans l'option `--experimental-sqlite`.

Si le port 3000 est occupé par un autre programme, la boutique glisse d'elle-même sur 3001,
3002… et affiche l'adresse retenue. Pour imposer un port :

```powershell
$env:PORT=3100; npm start   # PowerShell
PORT=3100 npm start         # bash
```

| Commande | Effet |
|---|---|
| `npm start` | Lance le serveur |
| `npm run dev` | Idem, avec rechargement automatique (`node --watch`) |
| `npm run seed` | Recharge le catalogue de départ (**écrase** les produits existants) |

### Configuration

Copiez `.env.example` en `.env` (chargé automatiquement au démarrage) :

```ini
PORT=3000
FALLAH_ADMIN_PASSWORD=un-mot-de-passe-solide   # obligatoire avant mise en ligne
FALLAH_SHOP_PHONE=+21612345678                 # numéro affiché au client
```

> ⚠️ Sans `FALLAH_ADMIN_PASSWORD`, le mot de passe vendeur est `fallah2026`.
> Le serveur l'affiche en jaune au démarrage tant qu'il n'est pas changé.

---

## Structure

```
fallah_web/
├── server/
│   ├── index.js      Serveur HTTP, routes API, fichiers statiques, sessions vendeur
│   ├── db.js         Schéma SQLite, statuts, règles boutique (livraison…)
│   ├── seed.js       Catalogue de départ (18 produits tunisiens)
│   └── validate.js   Validation client : téléphone tunisien, gouvernorats, panier
├── public/
│   ├── index.html    Boutique (hero, étapes, catalogue, panier)
│   ├── checkout.html Formulaire de commande + confirmation
│   ├── track.html    Suivi d'une commande
│   ├── admin.html    Espace vendeur
│   ├── css/style.css Design system (vert terre + or de récolte, RTL/LTR)
│   └── js/
│       ├── i18n.js   Dictionnaire ar/fr, formats prix, dates, quantités
│       ├── icons.js  Illustrations produits + icônes (SVG inline, zéro image externe)
│       ├── app.js    Panier (localStorage), appels API, toasts, en-tête
│       ├── shop.js · checkout.js · track.js · admin.js
└── data/fallah.db    Base SQLite (créée au premier démarrage, ignorée par git)
```

## API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/config` | Gouvernorats, frais de livraison, téléphone boutique |
| `GET` | `/api/products?category=&q=` | Catalogue public |
| `POST` | `/api/orders` | Créer une commande → `{ reference, total }` |
| `GET` | `/api/orders/track?reference=&phone=` | Suivi client |
| `POST` | `/api/admin/login` | `{ password }` → jeton de session (8 h) |
| `GET` | `/api/admin/orders` | Commandes + compteurs (en-tête `X-Admin-Token`) |
| `PATCH` | `/api/admin/orders/:id` | Changer le statut / la note interne |
| `GET` `PATCH` | `/api/admin/products[/:id]` | Prix, stock, mise en vente |

**Règle de sécurité appliquée partout : les prix, les stocks, les pas de vente et les totaux
sont recalculés côté serveur depuis la base.** Rien de ce que le navigateur envoie sur les
montants n'est repris tel quel. Le formulaire est aussi revalidé côté serveur (nom, téléphone
tunisien à 8 chiffres, gouvernorat livré, adresse), le débit de création de commandes est
limité par IP, et l'espace vendeur utilise une comparaison de mot de passe à temps constant.

---

## Personnaliser

| Quoi | Où |
|---|---|
| Produits, prix, producteurs, régions | `server/seed.js`, puis `npm run seed` — ou directement depuis `/admin.html` |
| Frais de livraison, seuil de gratuité | `SHOP` dans `server/db.js` (`5.000 DT`, offerte dès `60.000 DT`) |
| Gouvernorats livrés | `GOVERNORATES` dans `server/validate.js` |
| Textes arabes et français | `public/js/i18n.js` |
| Couleurs, arrondis, ombres | variables `:root` en haut de `public/css/style.css` |
| Illustrations produits | `PRODUCE` dans `public/js/icons.js` (champ `icon` du produit) |

## Mise en ligne

1. Définir `FALLAH_ADMIN_PASSWORD` et `FALLAH_SHOP_PHONE`.
2. Servir en **HTTPS** (l'hébergeur s'en charge, ou un reverse proxy nginx/Caddy) : le mot de
   passe vendeur et les téléphones des clients transitent en clair sans TLS.
3. Sauvegarder `data/fallah.db` régulièrement — c'est tout l'historique des commandes.

### Railway

Le projet tourne tel quel sur Railway : Nixpacks détecte `npm start`, il n'y a rien à
installer, et le serveur écoute déjà sur la variable `PORT` fournie par la plateforme.

Deux réglages sont indispensables :

1. **Un volume persistant monté sur `/app/data`.**
   Sans volume, le disque est éphémère : la base SQLite — donc toutes les commandes — est
   effacée à chaque redéploiement ou redémarrage.
2. **Les variables d'environnement** dans l'onglet *Variables* :

   ```ini
   FALLAH_ADMIN_PASSWORD=un-mot-de-passe-solide
   FALLAH_SHOP_PHONE=+21612345678
   ```

   Ne définissez **pas** `PORT` : Railway l'injecte lui-même.

Le catalogue de départ est réinséré automatiquement au premier démarrage si la base est vide ;
les prix et stocks modifiés depuis l'espace vendeur ne sont jamais écrasés.

> **Sauvegarde** : copiez le **dossier `data/` entier** (`fallah.db` *et* les fichiers
> `-wal` / `-shm`), pas seulement `fallah.db`. SQLite écrit d'abord dans le journal `-wal` :
> une copie du seul `.db` peut manquer les dernières commandes. À l'arrêt du serveur
> (`Ctrl+C`, redéploiement), le journal est replié dans `fallah.db` automatiquement.

Les mêmes règles valent pour Render, Fly.io ou un VPS : ce qu'il faut, c'est Node 24 et un
disque persistant pour `data/`.

Les sessions vendeur vivent en mémoire : un redémarrage du serveur oblige à se reconnecter.
