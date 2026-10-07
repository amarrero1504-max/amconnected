@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Falta Node.js, que es el programa que trae npm.
  echo Descargalo en https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)
node abrir.mjs
if errorlevel 1 pause
