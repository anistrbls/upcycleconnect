@echo off
echo.
echo ===========================================
echo   Lancement UpcycleConnect (mode dev)
echo ===========================================
echo.

:: Si le fichier .env n'existe pas, on le cree depuis .env.example
if not exist .env (
    echo [INFO] Fichier .env introuvable, copie depuis .env.example...
    copy .env.example .env
)

:: On lance les services en mode dev
echo [INFO] Lancement des services (docker compose -f docker-compose.dev.yml up --build -d)...
docker compose -f docker-compose.dev.yml up --build -d

echo.
echo [OK] Les services sont en train de demarrer.
echo.
echo -------------------------------------------
echo   - Frontend Admin: http://localhost:3000
echo   - API Backend:    http://localhost:8080/health
echo -------------------------------------------
echo.
echo [INFO] Pour voir les logs : docker compose -f docker-compose.dev.yml logs -f
echo.
pause
