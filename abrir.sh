#!/usr/bin/env bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js, que es el programa que trae npm."
  echo "Descárgalo en https://nodejs.org y vuelve a correr este archivo."
  exit 1
fi
exec node abrir.mjs
