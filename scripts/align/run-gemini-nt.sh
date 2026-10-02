#!/usr/bin/env bash
# Roda a frente B (gemini-align.mjs) no NT inteiro, livro a livro; capítulo pronto é pulado.
# Para quando a cota do Gemini acaba (saída 2); rode de novo depois para continuar.
# João fica de fora: tem gabarito próprio. Uso (de scripts/align): bash run-gemini-nt.sh
set -u
export GEMINI_API_KEY="${GEMINI_API_KEY:-$(powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')" | tr -d '\r')}"
for bk in MAT:28 MRK:16 LUK:24 ACT:28 ROM:16 1CO:16 2CO:13 GAL:6 EPH:6 PHP:4 COL:4 1TH:5 2TH:3 1TI:6 2TI:4 TIT:3 PHM:1 HEB:13 JAS:5 1PE:5 2PE:3 1JN:5 2JN:1 3JN:1 JUD:1 REV:22; do
  node gemini-align.mjs "${bk%%:*}" "1-${bk##*:}" || exit $?
done
echo "NT completo"
