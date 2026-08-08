#!/bin/bash
set -e

# Configurar caminhos do Go e ferramentas locais
export PATH="$HOME/.local/go/bin:$HOME/go/bin:$HOME/.local/bin:$PATH"
export GOROOT="$HOME/.local/go"
export GOPATH="$HOME/go"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
mkdir -p "${DIST_DIR}"

echo "========================================================"
echo "Compilando o Gerador de Escalas para Linux (Go + React)"
echo "========================================================"
echo ""

# 1. Compilar Frontend
echo "-> 1/3 Compilando Frontend (Vite + React)..."
cd "${ROOT_DIR}/GeradorEscalasWeb/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build

# 2. Compilar Binário Go/Wails Linux
echo ""
echo "-> 2/3 Compilando Binário Linux com WebKitGTK..."
cd "${ROOT_DIR}/GeradorEscalasWeb"
mkdir -p build/bin
go build -tags "desktop,production,webkit2_41" -ldflags "-w -s" -o "build/bin/GeradorEscalasWeb" .

echo "Binário gerado em: GeradorEscalasWeb/build/bin/GeradorEscalasWeb"

# 3. Gerar AppImage
echo ""
echo "-> 3/3 Empacotando AppImage..."
cd "${ROOT_DIR}"
bash "${ROOT_DIR}/packaging/appimage/build_appimage.sh"

echo ""
echo "========================================================"
echo "COMPILAÇÃO CONCLUÍDA COM SUCESSO!"
echo "Binário Nativo : GeradorEscalasWeb/build/bin/GeradorEscalasWeb"
echo "AppImage       : dist/GeradorEscalasWeb-x86_64.AppImage"
echo ""
echo "Para gerar também o Flatpak (requer flatpak-builder):"
echo "  bash packaging/flatpak/build_flatpak.sh"
echo "========================================================"
