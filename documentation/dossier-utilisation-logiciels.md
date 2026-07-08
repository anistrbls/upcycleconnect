# Dossier d'utilisation des produits logiciels
## Projet UpcycleConnect — ESGI Projet Annuel 2025-2026

---

## 1. Présentation du projet

**UpcycleConnect** est une plateforme web de mise en relation pour l'économie circulaire. Elle permet aux particuliers de déposer des objets à donner ou vendre, aux professionnels de les récupérer pour les upcycler, et aux salariés de gérer les contenus et ateliers.

### Stack technique
| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15 (React 19) |
| Backend (API) | Go 1.22 |
| Base de données | PostgreSQL 16 |
| Infrastructure | Docker / Docker Compose |
| Paiements | Stripe |
| Emails | Mailpit (dev) / SMTP (prod) |

---

## 2. Prérequis et installation

### 2.1 Logiciels à installer

| Logiciel | Version minimale | Téléchargement |
|----------|-----------------|----------------|
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop |
| Git | 2.x | https://git-scm.com |
| Visual Studio Code | 1.90+ | https://code.visualstudio.com |

### 2.2 Cloner le projet

```bash
git clone https://github.com/anistrbls/upcycleconnect.git
cd upcycleconnect
```

### 2.3 Lancer l'application (environnement de développement)

```bash
docker compose -f docker-compose.dev.yml up --build
```

L'application est accessible après 30-60 secondes de compilation.

| Service | URL |
|---------|-----|
| Application web | http://localhost:3000 |
| API (backend) | http://localhost:8080 |
| Base de données | localhost:5432 |
| Boîte mail de test | http://localhost:8025 |

### 2.4 Arrêter l'application

```bash
docker compose -f docker-compose.dev.yml down
```

---

## 3. Visual Studio Code

### 3.1 Ouvrir le projet

1. Lancer VS Code
2. `Fichier` → `Ouvrir un dossier` → sélectionner le dossier `upcycleconnect`
3. Le projet s'ouvre avec toute la structure visible dans l'explorateur gauche

### 3.2 Extensions recommandées

| Extension | Utilité |
|-----------|---------|
| **Go** (officielle Google) | Coloration syntaxique et autocomplétion Go |
| **ES7+ React/Redux** | Snippets pour le code React/Next.js |
| **Prettier** | Formatage automatique du code |
| **Docker** | Gestion des conteneurs depuis VS Code |
| **PostgreSQL** | Connexion et requêtes SQL directement dans l'éditeur |

### 3.3 Terminal intégré

- Raccourci : `Ctrl+ù` (Windows/Linux) ou `Ctrl+backtick` (Mac)
- Utiliser le terminal pour lancer les commandes Docker et Git

### 3.4 Structure du projet dans VS Code

```
upcycleconnect/
├── api/              ← Code backend Go
│   ├── main.go       ← Point d'entrée de l'API
│   ├── items/        ← Module annonces
│   ├── users/        ← Module utilisateurs
│   ├── projects/     ← Module projets
│   └── ...
├── frontend/         ← Code frontend Next.js
│   ├── src/app/      ← Pages de l'application
│   └── public/       ← Fichiers statiques
├── db/               ← Scripts SQL
│   ├── base_vide.sql          ← Schéma seul (sans données)
│   └── base_avec_donnees.sql  ← Schéma + données de démonstration
└── docker-compose.dev.yml     ← Configuration Docker développement
```

---

## 4. Docker Desktop

### 4.1 Vérifier que Docker fonctionne

Après installation, lancer Docker Desktop. L'icône baleine dans la barre des tâches doit être verte ("Docker Desktop is running").

### 4.2 Voir les conteneurs en cours d'exécution

Dans Docker Desktop → onglet **Containers** :

| Conteneur | Rôle |
|-----------|------|
| `upcycle-frontend-dev` | Interface web Next.js |
| `upcycle-api-dev` | API backend Go |
| `upcycle-db-dev` | Base de données PostgreSQL |
| `upcycle-mailpit-dev` | Serveur mail de test |

### 4.3 Voir les logs d'un conteneur

1. Cliquer sur le nom du conteneur dans Docker Desktop
2. Onglet **Logs** → affiche en temps réel les messages du service

Ou en ligne de commande :
```bash
docker logs upcycle-api-dev -f
docker logs upcycle-frontend-dev -f
```

### 4.4 Redémarrer un seul service

```bash
# Redémarrer uniquement l'API (après modification du code Go)
docker compose -f docker-compose.dev.yml up -d --build api
```

### 4.5 Accéder à la base de données via Docker

```bash
docker exec -it upcycle-db-dev psql -U admin -d upcycleconnect
```

---

## 5. Git et GitHub

### 5.1 Récupérer les dernières modifications (pull)

```bash
git pull
```

> ⚠️ Si des modifications locales bloquent le pull :
> ```bash
> git stash       # met de côté les modifs locales
> git pull        # récupère les nouveautés
> git stash pop   # réapplique les modifs locales
> ```

### 5.2 Sauvegarder et envoyer son travail (commit + push)

```bash
git add -A                          # ajoute tous les fichiers modifiés
git commit -m "Description claire"  # crée un point de sauvegarde
git push                            # envoie sur GitHub
```

### 5.3 Voir l'historique des modifications

```bash
git log --oneline -10   # 10 derniers commits
```

### 5.4 Dépôt GitHub

URL : https://github.com/anistrbls/upcycleconnect

---

## 6. L'application UpcycleConnect

### 6.1 Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | admin@upcycleconnect.fr | admin1234 |
| Particulier | particulier1@test.fr | Test1234! |
| Professionnel | professionnel1@test.fr | Test1234! |
| Salarié | salarie1@test.fr | Test1234! |

### 6.2 Espace Particulier

**Déposer une annonce**
1. Se connecter avec un compte particulier
2. Menu gauche → **Annonces** → **Déposer un objet**
3. Remplir : titre, description, type (don/vente), catégorie, matière, ville
4. Ajouter des photos si souhaité
5. Cliquer **Soumettre** → l'annonce passe en modération

**Voir ses annonces**
- Menu → **Mes annonces** : liste de toutes ses annonces avec leur statut (en attente, actif, refusé)

**Réserver un objet (pour un professionnel)**
- Menu → **Annonces disponibles** : parcourir les annonces actives
- Cliquer sur une annonce → **Réserver** → paiement si payant

**Suivi logistique**
- Menu → **Mes récupérations** : suivi étape par étape (réservé → déposé → récupéré)

**Projets upcycling**
- Menu → **Projets** → consulter les projets publiés par les professionnels
- Possibilité de liker et mettre en favoris

### 6.3 Espace Professionnel

**Parcourir les annonces disponibles**
- Menu → **Annonces disponibles** : filtrer par matière, ville, type
- Activer une alerte matériau pour être notifié à chaque nouvelle annonce correspondante

**Publier un projet upcycling**
- Menu → **Projets** → **Nouveau projet**
- Titre, description, photos, objets récupérés utilisés
- Soumission à validation par un administrateur

**Gérer ses prestations**
- Menu → **Mes prestations** : voir les réservations clients et leur statut

**Abonnements**
- Menu → **Mon abonnement** : choisir entre Gratuit, Pro Essentiel (15€/mois), Premium Atelier

### 6.4 Espace Salarié

**Conseils et actualités**
- Menu → **Conseils** → **Nouveau conseil** : rédiger un article ou conseil DIY
- L'article est soumis à validation avant publication

**Planning**
- Menu → **Mon planning** : visualiser les ateliers et formations assignés

**Formations**
- Menu → **Formations** : créer et gérer des sessions de formation

### 6.5 Espace Administrateur

**Dashboard**
- Vue d'ensemble : statistiques du mois (utilisateurs, annonces, revenus)
- Accès via le menu → **Vue globale**

**Modération**
- Menu → **Annonces** → **Modération** : valider ou refuser les annonces soumises
- Menu → **Projets** → **Modération** : valider les projets professionnels

**Gestion des utilisateurs**
- Menu → **Utilisateurs** : liste complète, modifier le rôle, suspendre un compte

**Événements**
- Menu → **Événements** : créer et gérer des ateliers et conférences publics

**Finances**
- Menu → **Finances** → Vue financière, commissions, abonnements, paiements Stripe
- Mise en avant : configurer les tarifs des options payantes

**Paramètres avancés**
- Menu → **Paramètres** → **Configuration** : langues, catégories, matériaux, motifs de modération

### 6.6 Module Support / Assistance

- Menu → **Assistance** : messagerie entre utilisateurs et l'équipe UpcycleConnect
- L'équipe (salariés/admins) reçoit et répond aux conversations

### 6.7 Paramètres de notification

- Menu → **Paramètres** → **Notifications**
- Chaque utilisateur choisit les alertes qu'il reçoit **dans l'application** et **par email**
- Les emails sont interceptés par Mailpit en développement : http://localhost:8025

---

## 7. Base de données

### 7.1 Se connecter avec DBeaver ou pgAdmin

| Paramètre | Valeur |
|-----------|--------|
| Hôte | localhost |
| Port | 5432 |
| Base | upcycleconnect |
| Utilisateur | admin |
| Mot de passe | *(défini dans le fichier .env)* |

### 7.2 Importer un fichier SQL

**Avec DBeaver :**
1. Clic droit sur la base → **Outils** → **Exécuter le script SQL**
2. Sélectionner `base_vide.sql` ou `base_avec_donnees.sql`
3. Cliquer **Démarrer**

**En ligne de commande (via Docker) :**
```bash
# Importer la base vide (schéma seul)
docker cp db/base_vide.sql upcycle-db-dev:/tmp/
docker exec upcycle-db-dev psql -U admin -d upcycleconnect -f /tmp/base_vide.sql

# Importer la base avec données de démonstration
docker cp db/base_avec_donnees.sql upcycle-db-dev:/tmp/
docker exec upcycle-db-dev psql -U admin -d upcycleconnect -f /tmp/base_avec_donnees.sql
```

### 7.3 Les deux fichiers SQL

| Fichier | Contenu |
|---------|---------|
| `db/base_vide.sql` | 54 tables, index et contraintes — aucune donnée |
| `db/base_avec_donnees.sql` | Même schéma + données de démonstration : 50 utilisateurs, 316 annonces, 94 projets, 39 événements, 75 conseils, 552 notifications |

---

## 8. Mailpit — Boîte mail de test

En développement, tous les emails envoyés par l'application sont capturés par **Mailpit** et affichés dans une interface web. Aucun email n'est réellement livré.

**Accès :** http://localhost:8025

**Cas d'usage :**
- Vérifier la réception d'une notification email après une action (réservation, validation, paiement...)
- Voir le contenu exact de l'email envoyé
- S'assurer que les préférences de notification de l'utilisateur sont respectées

---

## 9. Récapitulatif des URLs

| Service | URL | Identifiants |
|---------|-----|-------------|
| Application | http://localhost:3000 | Voir §6.1 |
| API REST | http://localhost:8080/api | Token JWT requis |
| Statut API | http://localhost:8080/api/status | Public |
| Mailpit (emails) | http://localhost:8025 | Aucun |
| Base de données | localhost:5432 | admin / voir .env |
