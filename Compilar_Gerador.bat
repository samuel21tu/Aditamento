@echo off
echo ========================================================
echo Compilando o Gerador de Escalas (Go + React)
echo ========================================================
echo.

set PATH=%PATH%;C:\Program Files\Go\bin
cd GeradorEscalasWeb

echo Iniciando o Wails Build... Isso pode demorar alguns minutos na primeira vez.
C:\Users\samue\go\bin\wails.exe build -skipbindings

if %ERRORLEVEL% == 0 (
    echo.
    echo ========================================================
    echo COMPILACAO CONCLUIDA COM SUCESSO!
    echo O seu executavel esta na pasta:
    echo GeradorEscalasWeb\build\bin\GeradorEscalasWeb.exe
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo OCORREU UM ERRO DURANTE A COMPILACAO.
    echo ========================================================
)

pause
