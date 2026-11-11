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
# LOG: ForceJava17ToolchainAndCompileOptions for silicion limits
if [ -f "app/build.gradle" ]; then
    sed -i '/compileOptions {/,/}/ { s/sourceCompatibility .*/sourceCompatibility JavaVersion.VERSION_17/; s/targetCompatibility .*/targetCompatibility JavaVersion.VERSION_17/; }' "app/build.gradle"
    sed -i 's/javaCompiler = javaToolchains.compilerFor {/javaCompiler = javaToolchains.compilerFor { \/\/ /g' "app/build.gradle"
    sed -i 's/languageVersion = JavaLanguageVersion.of(21)/languageVersion = JavaLanguageVersion.of(17)/g' "app/build.gradle"
    sed -i 's/targetCompatibility = JavaVersion.VERSION_21/targetCompatibility = JavaVersion.VERSION_17/g' "app/build.gradle"
    sed -i 's/sourceCompatibility = JavaVersion.VERSION_21/sourceCompatibility = JavaVersion.VERSION_17/g' "app/build.gradle"
    sed -i 's/release.set(21)/release.set(17)/g' "app/build.gradle"
    sed -i 's/release 21/release 17/g' "app/build.gradle"
fi

# 3. Forzar el uso de Gradle 8.13
WRAPPER_PROPERTIES="gradle/wrapper/gradle-wrapper.properties"
if [ -f "$WRAPPER_PROPERTIES" ]; then
    echo "⚙️ Actualizando versión de Gradle a 8.13..."
    sed -i 's|distributionUrl=.*|distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip|' "$WRAPPER_PROPERTIES"
fi

# 4. Asegurar dependencias de Capacitor (verificando la subcarpeta real /capacitor)
CAP_ANDROID_PATH="node_modules/@capacitor/android/capacitor"
if [ ! -d "$CAP_ANDROID_PATH" ]; then
    echo "⚙️ Instalando @capacitor/android en $PROYECTO_DIR..."
    [ ! -f "package.json" ] && npm init -y >/dev/null
    npm install @capacitor/android @capacitor/core --legacy-peer-deps
fi
# LOG: PatchJava21To17 compatibility downgrade for silicion limits
if [ -f "$CAP_ANDROID_PATH/build.gradle" ]; then
    sed -i 's/VERSION_21/VERSION_17/g' "$CAP_ANDROID_PATH/build.gradle"
    sed -i 's/compatibility = 21/compatibility = 17/g' "$CAP_ANDROID_PATH/build.gradle"
    sed -i 's/sourceCompatibility = 21/sourceCompatibility = 17/g' "$CAP_ANDROID_PATH/build.gradle"
    sed -i 's/targetCompatibility = 21/targetCompatibility = 17/g' "$CAP_ANDROID_PATH/build.gradle"
fi

# Verificación dura: si no existe el build.gradle de Capacitor, detenerse aquí con mensaje claro
if [ ! -f "$CAP_ANDROID_PATH/build.gradle" ]; then
    echo "❌ ERROR FATAL: No se encontró $CAP_ANDROID_PATH/build.gradle tras npm install."
    exit 1
fi

# Crear estructura mínima válida para capacitor-cordova-android-plugins si no existe
if [ ! -f "capacitor-cordova-android-plugins/build.gradle" ]; then
    mkdir -p "capacitor-cordova-android-plugins/src/main/java"
    cat << 'EOF' > capacitor-cordova-android-plugins/build.gradle
apply plugin: 'com.android.library'
android {
    namespace "capacitor.cordova.android.plugins"
    compileSdk 34
    defaultConfig {
        minSdk 22
    }
}
EOF
fi

# 5. Configurar settings.gradle apuntando a las rutas exactas
echo "⚙️ Configurando settings.gradle..."
cat << 'EOF' > settings.gradle
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "centiclock"
include ':app'

include ':capacitor-android'
project(':capacitor-android').projectDir = new File('node_modules/@capacitor/android/capacitor')

include ':capacitor-cordova-android-plugins'
project(':capacitor-cordova-android-plugins').projectDir = new File('capacitor-cordova-android-plugins')
EOF

# 6. Generar debug.keystore si no existe
if [ ! -f "debug.keystore" ]; then
    echo "🔑 Generando debug.keystore de firma..."
    keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true
fi

# 7. Generar gradlew si no existe o actualizar permisos
if [ ! -f "gradlew" ]; then
    echo "⚙️ Generando wrapper de Gradle..."
    gradle wrapper || true
fi

chmod +x gradlew 2>/dev/null || true

# 8. Evitar subir node_modules y carpetas de compilación pesadas a GitHub
if [ ! -f ".gitignore" ]; then
    cat << 'EOF' > .gitignore
node_modules/
.gradle/
build/
app/build/
local.properties
*.keystore
EOF
fi

# 9. Sincronizar con Git / GitHub apuntando al repositorio centiclock
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

# 10. Desinstalar versión anterior en el Pixel 7a
echo "🧹 Limpiando versión anterior en el Pixel 7a..."
if [ -f "$ADB_BIN" ]; then
    "$ADB_BIN" uninstall com.aistudio.centiclock 2>/dev/null || true
fi

# 11. Compilar e instalar en el Pixel 7a
echo "📱 Compilando e instalando en tu Pixel 7a..."
./gradlew installDebug

echo "✅ ¡PROCESO COMPLETADO EXITOSAMENTE! La app centiclock está actualizada en tu Pixel 7a y en GitHub."