@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Falta Node.js, que es el programa que trae npm.
  echo Descargalo en https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if exist "%~dp0abrir.mjs" goto launch

set "DEST=%USERPROFILE%\Vigia"
echo Actualizando Vigia...
set "ZIP=%TEMP%\vigia.zip"
curl.exe -fL --retry 3 -o "%ZIP%" "https://github.com/amarrero1504-max/amconnected/archive/refs/heads/main.zip"
if errorlevel 1 (
  if exist "%DEST%\abrir.mjs" (
    echo No pude actualizar. Abro la copia que ya esta.
    cd /d "%DEST%"
    goto launch
  )
  echo No pude descargar Vigia. Revisa la conexion e intentalo de nuevo.
  pause
  exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"
tar.exe -xf "%ZIP%" -C "%DEST%" --strip-components=1
if errorlevel 1 (
  echo No pude descomprimir Vigia.
  pause
  exit /b 1
)
del "%ZIP%" >nul 2>&1
if not exist "%DEST%\abrir.mjs" (
  echo La descarga no trajo Vigia completo.
  pause
  exit /b 1
)
cd /d "%DEST%"

:launch
node abrir.mjs
if errorlevel 1 pause
exit /b %ERRORLEVEL%
