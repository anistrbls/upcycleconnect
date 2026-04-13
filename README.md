# UpcycleConnect

Projet annuel conteneurisé avec Docker Compose.

L'application tourne avec :
- un frontend en Next.js
- une API en Go
- une base PostgreSQL

On a aussi ajouté des outils de monitoring/gestion en bonus (Portainer, Prometheus, cAdvisor, Grafana).

## Stack technique

| Service | Technologie | Port |

| Frontend | Next.js 15 / React 19 | `3000` |
| API Backend | Go 1.22 | `8080` |
| Base de données | PostgreSQL 16 | `5432` |
| Portainer (bonus) | Portainer CE | `9000` / `9443` |
| Prometheus (bonus) | Prometheus | `9090` |
| cAdvisor (bonus) | cAdvisor | `8081` |
| Grafana (bonus) | Grafana OSS | `3001` |

## Prérequis

- Docker + Docker Compose v2
- Git

## Lancement rapide

```bash
# 1) Cloner
git clone <url-du-repo> upcycleconnect
cd upcycleconnect

# 2) Préparer l'environnement
cp .env.example .env

# 3) Démarrer en dev
docker compose -f docker-compose.dev.yml up --build
```

## Docker Compose

On utilise 2 fichiers :

- `docker-compose.dev.yml` : pour coder en local (hot-reload, ports exposés, logs faciles)
- `docker-compose.prod.yml` : pour la prod (sécurité/stabilité + outils bonus)

### Différences principales

| Point | Dev | Prod |

| Code monté en volume | Oui | Non |
| Port DB exposé | Oui | Non |
| Restart auto | Non | Oui (`unless-stopped`) |
| Monitoring bonus | Non | Oui |

## URLs utiles

| Service | URL |

| Frontend | http://localhost:3000 |
| API health | http://localhost:8080/health |
| API ping | http://localhost:8080/ping |
| Portainer (prod) | http://localhost:9000 |
| Prometheus (prod) | http://localhost:9090 |
| Grafana (prod) | http://localhost:3001 |
| cAdvisor (prod) | http://localhost:8081 |

Note Grafana : le dashboard ID 893 est déjà provisionné automatiquement via `monitoring/grafana/dashboards/893-main.json`.

## Commandes utiles

```bash
# DEV
docker compose -f docker-compose.dev.yml up --build
docker compose -f docker-compose.dev.yml up --build -d
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml down -v

# PROD
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down
```

## Registre d'images (GHCR)

Les images API et frontend sont publiées sur GHCR via GitHub Actions.

Fichier CI : `.github/workflows/docker-publish.yml`

Déclenchement :

```bash
git push origin main
# ou
git tag v1.0.0 && git push origin v1.0.0
```

Format des images :

- `ghcr.io/<owner>/upcycle-api:<tag>`
- `ghcr.io/<owner>/upcycle-frontend:<tag>`

Variables à renseigner dans `.env` pour la prod :

- `IMAGE_REGISTRY=ghcr.io`
- `IMAGE_NAMESPACE=<owner>`
- `IMAGE_TAG=latest` (ou un tag de version)

Si GHCR est indisponible, vous pouvez lancer la prod en build local (sans pull registre) :

```bash
PROD_IMAGE_PULL_POLICY=never docker compose -f docker-compose.prod.yml up -d --build
```

Cette commande reconstruit localement `api` et `frontend` puis démarre les services.

## Variables d'environnement

| Variable | Description |

| `POSTGRES_USER` | User PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base |
| `JWT_SECRET` | Secret JWT |
| `JWT_EXPIRES_HOURS` | Durée du token |
| `ADMIN_EMAIL` | Email admin par défaut |
| `ADMIN_PASSWORD` | Mot de passe admin par défaut |

## Structure rapide

```text
upcycleconnect/
├── api/
├── db/
├── frontend/
├── monitoring/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

## Pourquoi cette architecture

- séparation claire frontend / backend / base
- même stack pour toute l'équipe avec Docker
- mode dev simple à utiliser
- mode prod plus propre et plus sécurisé
- monitoring ajouté pour la soutenance (bonus)


## Lien Figma (diagramme + docu)

https://www.figma.com/design/E64NqWVn4Pt3rfup36McnL/UpcycleConnect?node-id=165-30&t=newDIsXK2TqrPIT6-1

| Page "Docker" |