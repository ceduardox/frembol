# Build and Push Frembol Docker Image from local PC (64GB RAM)
$ErrorActionPreference = "Stop"

$COMMIT_HASH = (git rev-parse --short HEAD).Trim()
$IMAGE_LATEST = "seduardocallau/frembol:latest"
$IMAGE_TAG = "seduardocallau/frembol:$COMMIT_HASH"

Write-Host "==> Verificando conexion con Docker Desktop..." -ForegroundColor Cyan
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop no esta ejecutandose en Windows. Abre Docker Desktop y vuelve a ejecutar este script." -ForegroundColor Red
    exit 1
}

Write-Host "==> Compilando imagen Docker para Linux ($IMAGE_TAG)..." -ForegroundColor Cyan
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_APP_URL=https://frembol.com -t $IMAGE_LATEST -t $IMAGE_TAG .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la compilacion de Docker." -ForegroundColor Red
    exit 1
}

Write-Host "==> Subiendo imagenes optimizadas a Docker Hub ($IMAGE_TAG)..." -ForegroundColor Cyan
docker push $IMAGE_LATEST
docker push $IMAGE_TAG

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la subida a Docker Hub. Si no estas logueado, ejecuta: docker login" -ForegroundColor Red
    exit 1
}

# Update Dockerfile.coolify with exact commit tag to prevent VPS Docker cache issues
Write-Host "==> Actualizando Dockerfile.coolify con la version $COMMIT_HASH..." -ForegroundColor Cyan
$coolifyContent = "# Coolify deployment Dockerfile: Pulls the pre-built, optimized Linux image`n# built on your PC (64GB RAM) with zero CPU/RAM compilation impact on Hetzner VPS.`nFROM $IMAGE_TAG"
Set-Content -Path "Dockerfile.coolify" -Value $coolifyContent -Encoding utf8

git add Dockerfile.coolify
$gitDiff = git diff --cached --name-only
if ($gitDiff) {
    git commit -m "chore(deploy): point Dockerfile.coolify to $IMAGE_TAG"
    git push origin main
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " EXITOSO: Imagen $IMAGE_TAG publicada en Docker Hub!" -ForegroundColor Green
Write-Host " Repositorio actualizado con la version fija para Coolify." -ForegroundColor Green
Write-Host " En Coolify el despliegue ahora descargara esta version exacta" -ForegroundColor Yellow
Write-Host " en 15 segundos sin usar cache viejo ni saturar el VPS." -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Green
