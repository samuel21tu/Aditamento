#!/bin/bash
set -e

# Diretório raiz do projeto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FLATPAK_DIR="${ROOT_DIR}/packaging/flatpak"
OUTPUT_DIR="${ROOT_DIR}/dist"
BUILD_DIR="${FLATPAK_DIR}/build-dir"
REPO_DIR="${FLATPAK_DIR}/repo"

echo "========================================================"
echo "Gerando Pacote Flatpak para Linux"
echo "========================================================"

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

if ! command -v flatpak-builder &> /dev/null; then
    echo ""
    echo "[AVISO] 'flatpak-builder' não está instalado neste sistema."
    echo "Para gerar o pacote Flatpak (.flatpak), instale o flatpak-builder:"
    echo "  - Arch/CachyOS: sudo pacman -S flatpak-builder"
    echo "  - Ubuntu/Debian: sudo apt install flatpak-builder"
    echo "  - Fedora: sudo dnf install flatpak-builder"
    echo ""
    echo "O manifesto e todos os arquivos necessários estão prontos em: ${FLATPAK_DIR}"
    exit 1
fi

cd "${FLATPAK_DIR}"
echo "Construindo Flatpak via flatpak-builder..."
flatpak-builder --force-clean --repo="${REPO_DIR}" "${BUILD_DIR}" org.aditamento.GeradorEscalasWeb.yml

OUTPUT_BUNDLE="${OUTPUT_DIR}/GeradorEscalasWeb.flatpak"
echo "Gerando Flatpak Bundle (.flatpak)..."
flatpak build-bundle "${REPO_DIR}" "${OUTPUT_BUNDLE}" org.aditamento.GeradorEscalasWeb

echo ""
echo "========================================================"
echo "FLATPAK GERADO COM SUCESSO!"
echo "Localização do Bundle: ${OUTPUT_BUNDLE}"
echo ""
echo "Para instalar o Flatpak no sistema:"
echo "  flatpak install --user ${OUTPUT_BUNDLE}"
echo "Para executar:"
echo "  flatpak run org.aditamento.GeradorEscalasWeb"
echo "========================================================"
