@echo off
echo =========================================
echo Gerador de Escalas - Compilador para .exe
echo =========================================
echo.

REM Verifica se o Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado!
    echo Para gerar o .exe, voce precisa instalar o Python.
    echo Baixe em: https://www.python.org/downloads/
    echo ATENCAO: Durante a instalacao, marque a opcao "Add Python to PATH".
    pause
    exit /b
)

echo Instalando PyInstaller (ferramenta para criar o .exe)...
pip install pyinstaller

echo.
echo Compilando o aplicativo... isso pode demorar um pouco.
pyinstaller --noconfirm --onedir --windowed --name "GeradorEscalas"  "app.py"

echo.
echo =========================================
echo COMPILACAO CONCLUIDA!
echo =========================================
echo O seu executavel esta na pasta "dist\GeradorEscalas".
echo Voce pode mover a pasta "GeradorEscalas" (que esta dentro de dist) para onde quiser.
echo O arquivo principal e o "GeradorEscalas.exe".
pause
