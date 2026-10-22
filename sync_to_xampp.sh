#!/bin/bash
# sync_to_xampp.sh — Sincroniza api/ con /opt/lampp/htdocs/api/
# Uso: sudo bash sync_to_xampp.sh

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SRC="$DIR/api"
API_DST="/opt/lampp/htdocs/api"

mkdir -p "$API_DST"
mkdir -p "$API_DST/uploads/vehicles"
chmod -R 777 "$API_DST/uploads"

echo "🔄 Copiando archivos API a XAMPP (excluyendo uploads)..."
rsync -a --exclude 'uploads' "$API_SRC/" "$API_DST/"
echo "✅ Sincronización completada."
echo ""
echo "🚀 El sistema está listo. Nota: La BD se gestiona desde scripts/setup.sql"
