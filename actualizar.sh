#!/bin/bash
set -e

PROYECTO_DIR="$HOME/dsrrllo/centiclock"
DESCARGAS_DIR="$HOME/dsrrllo"
ADB_BIN="$HOME/Android/Sdk/platform-tools/adb"

# 1. Buscar el archivo ZIP más reciente de centiclock en descargas
ZIP_FILE=$(ls -t "$DESCARGAS_DIR"/*centiclock*.zip 2>/dev/null | head -n 1)

if [ -n "$ZIP_FILE" ]; then
    echo "📦 Procesando archivo ZIP: $ZIP_FILE..."
    mkdir -p "$PROYECTO_DIR"
    unzip -o "$ZIP_FILE" -d "$PROYECTO_DIR"
    rm "$ZIP_FILE"
else
    echo "ℹ️ No hay ZIP nuevo en $DESCARGAS_DIR, procesando estado actual en $PROYECTO_DIR..."
fi

cd "$PROYECTO_DIR"

# Verificar si el proyecto está anidado en una subcarpeta y nivelarlo
if [ ! -f "settings.gradle" ] && [ ! -f "settings.gradle.kts" ]; then
    SUBDIR=$(find . -maxdepth 2 \( -name "settings.gradle" -o -name "settings.gradle.kts" \) -not -path "*/.*" | head -n 1)
    if [ -n "$SUBDIR" ]; then
        PARENT_DIR=$(dirname "$SUBDIR")
        if [ "$PARENT_DIR" != "." ]; then
            echo "📂 Normalizando estructura: moviendo archivos desde $PARENT_DIR al directorio raíz..."
            rsync -avm --exclude='.git' "$PARENT_DIR/" ./
            rm -rf "$PARENT_DIR"
        fi
    fi
fi

# 2. Inyectar ruta del SDK de Android
echo "sdk.dir=$HOME/Android/Sdk" > local.properties

# 3. Forzar el uso de Gradle 8.13
WRAPPER_PROPERTIES="gradle/wrapper/gradle-wrapper.properties"
if [ -f "$WRAPPER_PROPERTIES" ]; then
    echo "⚙️ Actualizando versión de Gradle a 8.13..."
    sed -i 's|distributionUrl=.*|distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip|' "$WRAPPER_PROPERTIES"
fi

# 4. Reescribir settings.gradle de forma robusta sin errores de sintaxis en Gradle
echo "⚙️ Configurando settings.gradle de forma limpia..."
cat << 'EOF' > settings.gradle
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "centiclock"
include ':app'

def capacitorAndroidDir = new File('../node_modules/@capacitor/android')
if (capacitorAndroidDir.exists()) {
    include ':capacitor-android'
    project(':capacitor-android').projectDir = capacitorAndroidDir
}

def cordovaPluginsDir = new File('../capacitor-cordova-android-plugins')
if (cordovaPluginsDir.exists()) {
    include ':capacitor-cordova-android-plugins'
    project(':capacitor-cordova-android-plugins').projectDir = cordovaPluginsDir
}
EOF

# 5. Generar debug.keystore si no existe
if [ ! -f "debug.keystore" ]; then
    echo "🔑 Generando debug.keystore de firma..."
    keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true
fi

# 6. Generar gradlew si no existe o actualizar permisos
if [ ! -f "gradlew" ]; then
    echo "⚙️  Generando wrapper de Gradle..."
    gradle wrapper || true
fi

chmod +x gradlew 2>/dev/null || true

# 7. Sincronizar con Git / GitHub apuntando al repositorio centiclock
if [ ! -d ".git" ]; then
    echo "🌱 Inicializando repositorio de Git..."
    git init
    git add .
    git commit -m "Initial commit desde AI Studio: centiclock"
    gh repo create centiclock --public --source=. --push || true
else
    echo "🚀 Guardando nueva versión en Git y subiendo a GitHub (centiclock)..."
    git add .
    git commit -m "Actualización automática centiclock: $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push origin master || git push origin main || true
fi

# 8. Desinstalar versión anterior en el Pixel 7a
echo "🧹 Limpiando versión anterior en el Pixel 7a..."
if [ -f "$ADB_BIN" ]; then
    "$ADB_BIN" uninstall com.aistudio.centiclock 2>/dev/null || true
fi

# 9. Compilar e instalar en el Pixel 7a
echo "📱 Compilando e instalando en tu Pixel 7a..."
./gradlew installDebug

echo "✅ ¡PROCESO COMPLETADO EXITOSAMENTE! La app centiclock está actualizada en tu Pixel 7a y en GitHub."