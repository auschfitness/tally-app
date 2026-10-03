#!/usr/bin/env bash
# Roda a frente B (gemini-align.mjs) livro a livro; capítulo pronto é pulado.
# Para quando todas as cotas acabam (saída 2); rode de novo depois para continuar.
# João fica de fora: tem gabarito próprio.
# Uso (de scripts/align): bash run-gemini-nt.sh        (NT -> work/gem)
#                         bash run-gemini-nt.sh ot     (AT -> work/gem-ot)
# Chaves: variáveis de usuário do Windows GEMINI_API_KEY (várias, separadas por vírgula),
# OPENROUTER_API_KEY e OPENROUTER_MODELS (modelos :free, separados por vírgula).
set -u
envw() { powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('$1','User')" | tr -d '\r'; }
export GEMINI_API_KEY="${GEMINI_API_KEY:-$(envw GEMINI_API_KEY)}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-$(envw OPENROUTER_API_KEY)}"
export OPENROUTER_MODELS="${OPENROUTER_MODELS:-$(envw OPENROUTER_MODELS)}"
NT="MAT:28 MRK:16 LUK:24 ACT:28 ROM:16 1CO:16 2CO:13 GAL:6 EPH:6 PHP:4 COL:4 1TH:5 2TH:3 1TI:6 2TI:4 TIT:3 PHM:1 HEB:13 JAS:5 1PE:5 2PE:3 1JN:5 2JN:1 3JN:1 JUD:1 REV:22"
OT="GEN:50 EXO:40 LEV:27 NUM:36 DEU:34 JOS:24 JDG:21 RUT:4 1SA:31 2SA:24 1KI:22 2KI:25 1CH:29 2CH:36 EZR:10 NEH:13 EST:10 JOB:42 PSA:150 PRO:31 ECC:12 SNG:8 ISA:66 JER:52 LAM:5 EZK:48 DAN:12 HOS:14 JOL:3 AMO:9 OBA:1 JON:4 MIC:7 NAM:3 HAB:3 ZEP:3 HAG:2 ZEC:14 MAL:4"
[ "${1:-nt}" = "ot" ] && LIST=$OT || LIST=$NT
for bk in $LIST; do
  node gemini-align.mjs "${bk%%:*}" "1-${bk##*:}" || exit $?
done
echo "${1:-nt} completo"
