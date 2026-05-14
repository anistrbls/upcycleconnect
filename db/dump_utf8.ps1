# Dump PostgreSQL en UTF-8 (accents, emojis, caracteres speciaux).
# Ecriture dans le conteneur Linux puis docker cp pour garder UTF-8 et LF (blocs COPY).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repoRoot "docker-compose.dev.yml"
if (-not (Test-Path $composeFile)) {
    throw "Fichier introuvable: $composeFile"
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tmpInContainer = "/tmp/upcycle_dump_$stamp.sql"
$backupName = "upcycleconnect_backup_" + (Get-Date -Format "yyyy-MM-dd") + ".sql"
$localOut = Join-Path $repoRoot $backupName

function Assert-LastExit($step) {
    if ($LASTEXITCODE -ne 0) {
        throw "Echec ($step), code sortie: $LASTEXITCODE"
    }
}

Push-Location $repoRoot
try {
    $inner = "PGPASSWORD=`$POSTGRES_PASSWORD pg_dump -U `$POSTGRES_USER -d `$POSTGRES_DB --encoding=UTF8 --no-owner --no-acl -f $tmpInContainer"
    docker compose -f docker-compose.dev.yml exec -T db sh -c $inner
    Assert-LastExit "pg_dump"

    $dbContainer = "upcycle-db-dev"
    docker cp "${dbContainer}:$tmpInContainer" $localOut
    Assert-LastExit "docker cp"

    docker compose -f docker-compose.dev.yml exec -T db sh -c "rm -f $tmpInContainer"
    Assert-LastExit "rm dump temporaire"

    Write-Host "Dump ecrit: $localOut"
}
finally {
    Pop-Location
}
