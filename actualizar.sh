#!/bin/bash
# ==============================================================================
# USPS Dolly Clock - Actualizador para Visual Studio Code y GitHub (Sin Android Studio)
# ==============================================================================
# Este script está diseñado especialmente para usuarios de Visual Studio Code.
# No necesitas instalar Android Studio: al subir tus cambios a GitHub,
# GitHub compilará automáticamente el archivo APK listo para tu teléfono.
# ==============================================================================

set -e

# Colores para la terminal de VS Code
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${PURPLE}${BOLD}================================================================${NC}"
echo -e "${CYAN}${BOLD}   ⏱️  USPS DOLLY CLOCK - ACTUALIZACIÓN DESDE VISUAL STUDIO CODE  ${NC}"
echo -e "${PURPLE}${BOLD}================================================================${NC}"
echo ""

# 1. Verificar dependencias de Node.js
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚙️  [1/4] Instalando dependencias de Node.js en VS Code...${NC}"
  npm install
else
  echo -e "${GREEN}✓ [1/4] Dependencias verificadas.${NC}"
fi

# 2. Compilar el frontend web para producción
echo ""
echo -e "${CYAN}🔨 [2/4] Compilando frontend web (Vite + Tailwind)...${NC}"
npm run build
echo -e "${GREEN}✓ Archivos compilados en la carpeta dist/${NC}"

# 3. Sincronizar activos con el contenedor Android de Capacitor
echo ""
echo -e "${CYAN}📱 [3/4] Sincronizando archivos con el proyecto Android...${NC}"
npx cap sync android
echo -e "${GREEN}✓ Todo listo en la carpeta android/ sin necesidad de Android Studio!${NC}"

# 4. Gestión de Git y subida a GitHub
echo ""
echo -e "${CYAN}🐙 [4/4] Subiendo a GitHub para compilación automática del APK...${NC}"

COMMIT_MSG="${1:-Actualizar USPS Dolly Clock para teléfono}"

if command -v git &> /dev/null; then
  if [ -d ".git" ]; then
    git add .
    if git diff-index --quiet HEAD --; then
      echo -e "${YELLOW}No hay cambios nuevos pendientes de commit.${NC}"
    else
      git commit -m "$COMMIT_MSG"
      echo -e "${GREEN}✓ Commit guardado: \"$COMMIT_MSG\"${NC}"
    fi

    # Subir a la rama activa
    if git remote | grep -q 'origin'; then
      CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
      echo -e "${YELLOW}Subiendo cambios a GitHub (${CURRENT_BRANCH})...${NC}"
      git push origin "$CURRENT_BRANCH"
      echo ""
      echo -e "${GREEN}${BOLD}================================================================${NC}"
      echo -e "${GREEN}${BOLD}  🚀 ¡LISTO! GITHUB ESTÁ COMPILANDO TU APK AUTOMÁTICAMENTE        ${NC}"
      echo -e "${GREEN}${BOLD}================================================================${NC}"
      echo -e "Como usas ${BOLD}Visual Studio Code${NC} y no tienes Android Studio, tu APK"
      echo -e "se genera en los servidores de GitHub:"
      echo ""
      echo -e "  1. Entra a tu repositorio en GitHub desde tu teléfono o computadora."
      echo -e "  2. Haz clic en la pestaña ${YELLOW}'Actions'${NC}."
      echo -e "  3. Abre la última ejecución verde: ${BOLD}'Compilar APK Android'${NC}."
      echo -e "  4. En la parte inferior descarga el archivo: ${BOLD}${GREEN}USPS-Dolly-Clock-APK${NC}."
      echo -e "  5. Pásalo o ábrelo en tu teléfono Android y pulsa 'Instalar'."
      echo ""
    else
      echo -e "${YELLOW}ℹ️  Aún no has vinculado tu repositorio remoto de GitHub.${NC}"
      echo -e "   Para conectarlo con GitHub desde la terminal de VS Code ejecuta:"
      echo -e "   ${BOLD}git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git${NC}"
      echo -e "   ${BOLD}git branch -M main${NC}"
      echo -e "   ${BOLD}git push -u origin main${NC}"
    fi
  else
    echo -e "${YELLOW}ℹ️  Git no está inicializado en esta carpeta.${NC}"
    echo -e "   Para inicializarlo ejecuta en tu terminal de VS Code:"
    echo -e "   ${BOLD}git init && git add . && git commit -m \"Primer commit Android\"${NC}"
  fi
else
  echo -e "${RED}Git no está instalado o no está en el PATH.${NC}"
fi

echo ""
echo -e "${CYAN}💡 OTRAS FORMAS DE USAR EN TU TELÉFONO DESDE VS CODE:${NC}"
echo -e "  • ${BOLD}Forma Inmediata (PWA Offline):${NC} Ejecuta ${YELLOW}npm run dev${NC} o abre tu URL en Chrome de Android"
echo -e "    y toca 'Agregar a la pantalla principal' / 'Instalar app'."
echo -e "  • Funciona al 100% sin conexión a internet y se comporta exactamente igual a una app nativa."
echo ""
