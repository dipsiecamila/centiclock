#!/bin/bash
# ==============================================================================
# USPS Dolly Clock - Descomprimir ZIP + Subir a GitHub + Instalar USB (Pixel 7a)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}   ⏱️  USPS DOLLY CLOCK - ACTUALIZACIÓN COMPLETA (PIXEL 7A)      ${NC}"
echo -e "${CYAN}${BOLD}================================================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# 1. Buscar y descomprimir centiclock.zip
# ------------------------------------------------------------------------------
ZIP_PATH="$HOME/dsrrllo/centiclock.zip"
if [ ! -f "$ZIP_PATH" ] && [ -f "../centiclock.zip" ]; then
  ZIP_PATH="../centiclock.zip"
fi

PKG_CHANGED=0
if [ -f "$ZIP_PATH" ]; then
  echo -e "${CYAN}📦 [1/5] Descomprimiendo ${ZIP_PATH}...${NC}"
  TMP_DIR=$(mktemp -d)
  trap 'rm -rf "$TMP_DIR"' EXIT

  unzip -q -o "$ZIP_PATH" -d "$TMP_DIR"

  if [ -f "$TMP_DIR/package.json" ]; then
    SRC_DIR="$TMP_DIR"
  else
    SRC_DIR=$(find "$TMP_DIR" -mindepth 1 -maxdepth 2 -name "package.json" -printf "%h\n" | head -n 1)
  fi

  if [ -z "$SRC_DIR" ] || [ ! -f "$SRC_DIR/package.json" ]; then
    echo -e "${RED}[Error] No se encontró package.json dentro de $ZIP_PATH.${NC}"
    exit 1
  fi

  if [ -f "package.json" ] && ! cmp -s "$SRC_DIR/package.json" "package.json"; then
    PKG_CHANGED=1
  fi

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='android/.gradle' \
      --exclude='android/app/build' \
      --exclude='actualizar.sh' \
      --exclude='actualizae.sh' \
      "$SRC_DIR"/ ./
  else
    rm -rf "$SRC_DIR/.git" "$SRC_DIR/node_modules" "$SRC_DIR/actualizar.sh" "$SRC_DIR/actualizae.sh"
    cp -a "$SRC_DIR"/. ./
  fi

  echo -e "${GREEN}✓ Código actualizado desde ${ZIP_PATH}.${NC}"
else
  echo -e "${YELLOW}⚠️  No se encontró ${ZIP_PATH}. Se usará el código actual de la carpeta.${NC}"
fi

# ------------------------------------------------------------------------------
# 2. Verificar dependencias de Node.js
# ------------------------------------------------------------------------------
if [ ! -d "node_modules" ] || [ "$PKG_CHANGED" -eq 1 ]; then
  echo -e "${YELLOW}⚙️  [2/5] Instalando dependencias de Node.js...${NC}"
  npm install --legacy-peer-deps
else
  echo -e "${GREEN}✓ [2/5] Dependencias verificadas.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Generar iconos, tonos nativos, compilar Vite y sincronizar Android
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}🎨 [3/5] Generando iconos, tonos nativos y compilando...${NC}"
node scripts/generate-icons.js
node scripts/generate-alarm-sounds.js
npm run build
npx cap sync android
echo -e "${GREEN}✓ Compilación y sincronización Android completadas.${NC}"

# ------------------------------------------------------------------------------
# 4. Subir cambios a GitHub
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}🐙 [4/5] Subiendo cambios a GitHub...${NC}"
COMMIT_MSG="${1:-Actualizacion USPS Dolly Clock}"
if [ -d ".git" ]; then
  git add .
  if git diff --cached --quiet; then
    echo -e "${YELLOW}ℹ️  No hay cambios nuevos para hacer commit en Git.${NC}"
  else
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ Commit guardado: \"$COMMIT_MSG\"${NC}"
  fi

  if git remote | grep -q 'origin'; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    git push origin "$CURRENT_BRANCH"
    echo -e "${GREEN}✓ Cambios subidos a GitHub (${CURRENT_BRANCH}).${NC}"
  else
    echo -e "${YELLOW}⚠️  No hay remoto 'origin' configurado en Git.${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Esta carpeta no tiene repositorio .git inicializado.${NC}"
fi

# ------------------------------------------------------------------------------
# 5. Compilar APK e instalar por USB en Pixel 7a
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}📱 [5/5] Compilando APK e instalando en Pixel 7a por USB...${NC}"

export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"

if adb devices | grep -w "device" | grep -v "devices" > /dev/null; then
  cd android
  chmod +x ./gradlew
  ./gradlew assembleDebug
  cd ..

  sudo -E "$HOME/Android/Sdk/platform-tools/adb" kill-server
  sudo -E "$HOME/Android/Sdk/platform-tools/adb" start-server
  sudo -E "$HOME/Android/Sdk/platform-tools/adb" install -r android/app/build/outputs/apk/debug/app-debug.apk

  echo ""
  echo -e "${GREEN}${BOLD}================================================================${NC}"
  echo -e "${GREEN}${BOLD}  🚀 ¡LISTO! SUBIDO A GITHUB E INSTALADO EN TU PIXEL 7A         ${NC}"
  echo -e "${GREEN}${BOLD}================================================================${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}${BOLD}[error] No devices found. Conecte el Pixel 7a por USB con depuración activa.${NC}"
  echo ""
  exit 1
fi