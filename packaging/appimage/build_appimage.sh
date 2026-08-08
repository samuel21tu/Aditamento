#!/bin/bash
set -e

# Diretório raiz do projeto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPIMAGE_DIR="${ROOT_DIR}/packaging/appimage"
APP_DIR="${APPIMAGE_DIR}/AppDir"
OUTPUT_DIR="${ROOT_DIR}/dist"

echo "========================================================"
echo "Gerando AppImage para Linux (x86_64)"
echo "========================================================"

# Criar diretórios
mkdir -p "${APP_DIR}/usr/bin"
mkdir -p "${APP_DIR}/usr/share/applications"
mkdir -p "${APP_DIR}/usr/share/icons/hicolor/256x256/apps"
mkdir -p "${OUTPUT_DIR}"

# Garantir que o binário mais recente esteja construído
if [ ! -f "${ROOT_DIR}/GeradorEscalasWeb/build/bin/GeradorEscalasWeb" ]; then
    echo "Binário Linux não encontrado. Compilando..."
    export PATH="$HOME/.local/go/bin:$HOME/go/bin:$HOME/.local/bin:$PATH"
    export GOROOT="$HOME/.local/go"
    export GOPATH="$HOME/go"
    cd "${ROOT_DIR}/GeradorEscalasWeb/frontend" && npm run build
    cd "${ROOT_DIR}/GeradorEscalasWeb"
    go build -tags "desktop,production,webkit2_41" -ldflags "-w -s" -o "build/bin/GeradorEscalasWeb" .
fi

# Copiar binário
cp "${ROOT_DIR}/GeradorEscalasWeb/build/bin/GeradorEscalasWeb" "${APP_DIR}/usr/bin/GeradorEscalasWeb"
chmod +x "${APP_DIR}/usr/bin/GeradorEscalasWeb"

# Copiar ícone
cp "${ROOT_DIR}/GeradorEscalasWeb/build/appicon.png" "${APP_DIR}/gerador-escalas.png"
cp "${ROOT_DIR}/GeradorEscalasWeb/build/appicon.png" "${APP_DIR}/usr/share/icons/hicolor/256x256/apps/gerador-escalas.png"

# Criar .desktop
cat << 'EOF' > "${APP_DIR}/gerador-escalas.desktop"
[Desktop Entry]
Type=Application
Name=Gerador de Escala
Comment=Gerador de Escalas e Aditamentos
Exec=GeradorEscalasWeb
Icon=gerador-escalas
Categories=Office;Utility;
Terminal=false
StartupNotify=true
EOF
cp "${APP_DIR}/gerador-escalas.desktop" "${APP_DIR}/usr/share/applications/gerador-escalas.desktop"

# Criar AppRun
cat << 'EOF' > "${APP_DIR}/AppRun"
#!/bin/sh
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="${HERE}/usr/share:${XDG_DATA_DIRS}"
exec "${HERE}/usr/bin/GeradorEscalasWeb" "$@"
EOF
chmod +x "${APP_DIR}/AppRun"

# Baixar appimagetool se não existir
APPIMAGETOOL="${HOME}/.local/bin/appimagetool"
if [ ! -f "${APPIMAGETOOL}" ]; then
    echo "Baixando appimagetool..."
    mkdir -p "${HOME}/.local/bin"
    curl -sL "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" -o "${APPIMAGETOOL}" || \
    curl -sL "https://github.com/AppImageCommunity/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" -o "${APPIMAGETOOL}"
    chmod +x "${APPIMAGETOOL}"
fi

# Gerar AppImage
OUTPUT_FILE="${OUTPUT_DIR}/GeradorEscalasWeb-x86_64.AppImage"
echo "Empacotando com appimagetool..."
ARCH=x86_64 "${APPIMAGETOOL}" --appimage-extract-and-run "${APP_DIR}" "${OUTPUT_FILE}"

chmod +x "${OUTPUT_FILE}"
echo ""
echo "========================================================"
echo "APPIMAGE GERADO COM SUCESSO!"
echo "Localização: ${OUTPUT_FILE}"
echo "========================================================"
