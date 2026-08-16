#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

REPO="mmhgarcia/kanban"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
BUILD_LOG="/tmp/kanban-build.log"

echo "=== Publicar APK en GitHub Releases ==="
echo ""

GH_BIN=""
if command -v gh &>/dev/null; then
  GH_BIN="gh"
elif [ -n "$(ls /tmp/gh_*/bin/gh 2>/dev/null)" ]; then
  GH_BIN=$(ls /tmp/gh_*/bin/gh 2>/dev/null | head -1)
else
  echo "gh no encontrado. Descargando..."
  GH_VERSION=$(curl -s https://api.github.com/repos/cli/cli/releases/latest | grep '"tag_name"' | sed 's/.*v\(.*\)".*/\1/')
  curl -sL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" -o /tmp/gh.tar.gz
  tar -xzf /tmp/gh.tar.gz -C /tmp
  GH_BIN="/tmp/gh_${GH_VERSION}_linux_amd64/bin/gh"
  rm -f /tmp/gh.tar.gz
fi

if [ -z "${GH_TOKEN:-}" ]; then
  read -rsp "GitHub Token: " GH_TOKEN
  echo
  export GH_TOKEN
fi

"$GH_BIN" auth status >/dev/null 2>&1
echo "Autenticado como mmhgarcia."
echo ""

DEFAULT_VERSION="v$(date +%Y.%-m.%-d)"
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  read -rp "Versión [$DEFAULT_VERSION]: " VERSION
  VERSION="${VERSION:-$DEFAULT_VERSION}"
fi

LAST_COMMIT=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "Actualización")
NOTES="${2:-}"
if [ -z "$NOTES" ]; then
  read -rp "Notas [$LAST_COMMIT]: " NOTES
  NOTES="${NOTES:-$LAST_COMMIT}"
fi

echo ""
echo "--- Resumen ---"
echo "  Versión:  $VERSION"
echo "  Notas:    $NOTES"
echo ""
read -rp "Publicar? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 0
fi

echo ""
echo "Compilando app web..."
npm run cap:sync >"$BUILD_LOG" 2>&1

echo "Generando APK (esto puede tardar)..."
cd android && ./gradlew assembleDebug >>"$BUILD_LOG" 2>&1 && cd ..

if [ ! -f "$APK_PATH" ]; then
  echo "Error: no se encontró el APK. Log: $BUILD_LOG"
  exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "APK generado ($APK_SIZE)"
cp "$APK_PATH" "$SCRIPT_DIR/kanban-${VERSION}.apk"

echo "Publicando release $VERSION..."
RELEASE_URL=$("$GH_BIN" release create "$VERSION" "$APK_PATH" \
  --repo "$REPO" \
  --title "Tensión $VERSION" \
  --notes "$NOTES" 2>&1) || {
  echo "Error al publicar: $RELEASE_URL"
  exit 1
}

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/app-debug.apk"

echo ""
echo "============================================"
echo "  RELEASE PUBLICADA"
echo "============================================"
echo ""
echo "  Release:"
echo "  https://github.com/$REPO/releases/tag/$VERSION"
echo ""
echo "  Descargar APK:"
echo "  $DOWNLOAD_URL"
echo ""
echo "============================================"
echo ""
read -rp "Enviar link por WhatsApp? (s/N): " SEND_WA
if [[ "$SEND_WA" =~ ^[sS]$ ]]; then
  WA_MSG=$(python3 -c "import urllib.parse; print(urllib.parse.quote('Nueva versión de Tensión ($VERSION)\n$NOTES\n\nDescargar APK:\n$DOWNLOAD_URL'))")
  WA_URL="https://api.whatsapp.com/send?text=${WA_MSG}"
  if command -v wslview &>/dev/null; then
    wslview "$WA_URL"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$WA_URL"
  else
    echo "Abre este link en tu navegador:"
    echo "  $WA_URL"
  fi
fi
