@echo off
setlocal

echo ==========================================
echo        Configuracao do FFmpeg
echo ==========================================
echo.

REM Caminhos
set "ROOT=%~dp0"
set "FFMPEG_DIR=%ROOT%ferramentas\ffmpeg"
set "BIN_DIR=%FFMPEG_DIR%\bin"
set "ZIP=%TEMP%\ffmpeg.zip"
set "EXTRACT_DIR=%TEMP%\ffmpeg_extract"

REM URL do build Essentials
set "URL=https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

REM Verifica se ja esta instalado
if exist "%BIN_DIR%\ffmpeg.exe" if exist "%BIN_DIR%\ffprobe.exe" (
    echo FFmpeg ja esta instalado.
    echo.
    echo Local:
    echo %BIN_DIR%
    echo.
    "%BIN_DIR%\ffmpeg.exe" -version | findstr /B "ffmpeg version"
    echo.
    pause
    exit /b 0
)

echo FFmpeg nao encontrado.
echo Iniciando download...
echo.

REM Limpa arquivos temporarios antigos
if exist "%ZIP%" del /q "%ZIP%"
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"

REM Cria pasta de destino
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

REM Baixa o FFmpeg
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%URL%' -OutFile '%ZIP%'"

if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel baixar o FFmpeg.
    echo.
    pause
    exit /b 1
)

echo Download concluido.
echo.

REM Extrai o ZIP usando PowerShell
echo Extraindo arquivo...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%EXTRACT_DIR%' -Force"

if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel extrair o FFmpeg.
    echo.
    pause
    exit /b 1
)

echo Extracao concluida.
echo.

REM Procura e copia somente os executaveis necessarios
echo Copiando ffmpeg.exe...

for /r "%EXTRACT_DIR%" %%F in (ffmpeg.exe) do (
    copy /y "%%F" "%BIN_DIR%\ffmpeg.exe" >nul
    goto :ffmpeg_found
)

echo ERRO: ffmpeg.exe nao foi encontrado.
goto :error

:ffmpeg_found

echo ffmpeg.exe copiado.
echo.

echo Copiando ffprobe.exe...

for /r "%EXTRACT_DIR%" %%F in (ffprobe.exe) do (
    copy /y "%%F" "%BIN_DIR%\ffprobe.exe" >nul
    goto :ffprobe_found
)

echo ERRO: ffprobe.exe nao foi encontrado.
goto :error

:ffprobe_found

REM Limpa temporarios
echo.
echo Limpando arquivos temporarios...

if exist "%ZIP%" del /q "%ZIP%"
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"

echo.
echo ==========================================
echo       FFmpeg instalado com sucesso!
echo ==========================================
echo.
echo Local:
echo %BIN_DIR%
echo.
echo Arquivos instalados:
echo   ffmpeg.exe
echo   ffprobe.exe
echo.

"%BIN_DIR%\ffmpeg.exe" -version | findstr /B "ffmpeg version"
echo.

pause
exit /b 0

:error

echo.
echo ==========================================
echo             ERRO NA INSTALACAO
echo ==========================================
echo.

if exist "%ZIP%" del /q "%ZIP%"
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"

pause
exit /b 1
