# [UpcycleConnect] Lancement en mode dev

# Si .env n'existe pas, on le cree depuis .env.example
if (-not (Test-Path ".env")) {
    Write-Host "[INFO] Fichier .env introuvable, copie depuis .env.example..." -ForegroundColor Blue
    Copy-Item ".env.example" ".env"
}

# Verification rapide que Docker tourne bien
try {
    docker info > $null 2>&1
} catch {
    Write-Host "[ERROR] Docker n'est pas lance (ou introuvable). Demarre Docker Desktop puis relance le script." -ForegroundColor Red
    exit 1
}

# Lancement de tous les services dev
Write-Host "[INFO] Lancement des services (docker compose -f docker-compose.dev.yml up --build -d)..." -ForegroundColor Cyan
docker compose -f docker-compose.dev.yml up --build -d

Write-Host "`n[OK] Les services UpcycleConnect sont en train de demarrer." -ForegroundColor Green
Write-Host "--------------------------------------------------------"
Write-Host " - Frontend Admin: http://localhost:3000" -ForegroundColor Cyan
Write-Host " - API Backend:    http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host "`nPour voir les logs : docker compose -f docker-compose.dev.yml logs -f" -ForegroundColor Yellow
