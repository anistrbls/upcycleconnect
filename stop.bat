@echo off
echo.
echo ===========================================
echo   Arret UpcycleConnect (mode dev)
echo ===========================================
echo.

echo [INFO] Arret des services (docker compose -f docker-compose.dev.yml down)...
docker compose -f docker-compose.dev.yml down

echo.
echo [OK] Services arretes.
echo.
pause
