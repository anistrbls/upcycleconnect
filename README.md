# UpcycleConnect

Socle technique pour le projet UpcycleConnect.

## Architecture

| Service | Technologie | Port |
|---------|------------|------|
| Frontend Admin | Next.js 15 / React 19 | `3000` |
| API | Go 1.22 | `8080` |
| Base de données | PostgreSQL 16 | `5432` |

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Git

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone <url-du-repo> upcycleconnect
cd upcycleconnect

# 2. Créer le fichier d'environnement
cp .env.example .env

# 3. Lancer tous les services
docker compose up --build
```

## URLs de test

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| API Health | [http://localhost:8080/health](http://localhost:8080/health) |
| API Ping | [http://localhost:8080/ping](http://localhost:8080/ping) |

## Commandes utiles

```bash
# Démarrer en arrière-plan
docker compose up --build -d

# Voir les logs
docker compose logs -f

# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (reset DB)
docker compose down -v

# Reconstruire un service spécifique
docker compose build api
docker compose build frontend
```

## Structure du projet

```
upcycleconnect/
├── frontend-admin/   # Application Next.js (interface admin)
├── api/              # API Go (serveur HTTP)
├── db/               # Scripts SQL d'initialisation
├── docker-compose.yml
├── .env.example
└── README.md
```

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `admin` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `changeme` |
| `POSTGRES_DB` | Nom de la base de données | `upcycleconnect` |
