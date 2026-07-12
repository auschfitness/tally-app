---
name: verify-app
description: Roda a verificação do app Tally (teste de fumaça + build) e reporta verde/vermelho com os erros. Usar após qualquer mudança de código. Invocar como /verify-app.
context: fork
agent: general-purpose
allowed-tools: Bash, Read, Grep
---

# Verificar o app Tally

Rode a verificação e devolva SÓ o veredito. NÃO edite arquivos.

Os comandos rodam a partir da **raiz do repositório** (onde está o `package.json`).
Se o `node_modules` não existir, avise que é preciso rodar `npm install` primeiro.

1. **Teste de fumaça** — o `npm test` do projeto (que roda `node test/compare.mjs`,
   comparando o HTML de todas as telas do código modular com o original):
   ```bash
   npm test
   ```
   Se por algum motivo não houver o script `test`, rode direto: `node test/compare.mjs`.

2. **Build de produção**:
   ```bash
   npm run build
   ```

3. Se **ambos** passarem (o teste termina em "RESULTADO: OK — paridade total" e
   o build termina em "built in ..."), responda em UMA linha:
   `✅ Verde — teste e build OK`.

4. Se algo falhar, liste os erros de forma concisa (`arquivo:linha` + mensagem)
   e proponha a correção, **sem aplicá-la**. Dicas de leitura:
   - O teste imprime, para cada tela que difere, o `char` onde divergiu e os
     trechos `mono:` (original) vs `split:` (modular) — use isso para achar a
     função culpada em `src/`.
   - O build (Vite) aponta erros de import/sintaxe com `arquivo:linha`.
