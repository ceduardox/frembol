#!/usr/bin/env bash
set -euo pipefail

# FREMBOL: base de datos + archivos subidos, en un solo paso.
# Uso:
#   DATABASE_URL="postgresql://..." bash scripts/backup-data.sh
# Opcional:
#   UPLOAD_DIR=/app/data/uploads
#   BACKUP_DIR=/app/data/backups
#   KEEP_DAYS=14
#
# Guarda fuera del VPS el contenido de BACKUP_DIR. Este script no borra nada
# fuera de su carpeta de backups.

: "${DATABASE_URL:?Define DATABASE_URL con la cadena de PostgreSQL}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/data/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/app/data/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
DB_FILE="$BACKUP_DIR/frembol-db-$STAMP.dump"
FILES_FILE="$BACKUP_DIR/frembol-uploads-$STAMP.tar.gz"

echo "Backup de base de datos..."
pg_dump "$DATABASE_URL" --format=custom --file="$DB_FILE"

if [ -d "$UPLOAD_DIR" ]; then
  echo "Backup de archivos subidos..."
  tar -C "$(dirname "$UPLOAD_DIR")" -czf "$FILES_FILE" "$(basename "$UPLOAD_DIR")"
else
  echo "Aviso: no existe $UPLOAD_DIR; se omite el backup de archivos."
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -mtime +"$KEEP_DAYS" -delete

echo "Listo:"
echo "  $DB_FILE"
[ -f "$FILES_FILE" ] && echo "  $FILES_FILE"
echo "Copia estos archivos fuera del VPS."
