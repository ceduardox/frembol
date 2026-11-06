# Build and Push Frembol Docker Image from local PC (64GB RAM)
$ErrorActionPreference = "Stop"
$IMAGE_NAME = "seduardocallau/frembol:latest"

Write-Host "==> Verificando conexion con Docker Desktop..." -ForegroundColor Cyan
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop no esta ejecutandose en Windows. Abre Docker Desktop y vuelve a ejecutar este script." -ForegroundColor Red
    exit 1
}

Write-Host "==> Compilando imagen Docker para Linux ($IMAGE_NAME)..." -ForegroundColor Cyan
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_APP_URL=https://frembol.com -t $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la compilacion de Docker." -ForegroundColor Red
    exit 1
}

Write-Host "==> Subiendo imagen optimizada a Docker Hub ($IMAGE_NAME)..." -ForegroundColor Cyan
docker push $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Fallo la subida a Docker Hub. Si no estas logueado, ejecuta: docker login" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " EXITOSO: Imagen $IMAGE_NAME publicada en Docker Hub!" -ForegroundColor Green
Write-Host " En Coolify el despliegue ahora tardara solo 15 segundos" -ForegroundColor Yellow
Write-Host " sin consumir CPU ni RAM en el servidor Hetzner." -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Green
