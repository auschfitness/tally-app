# Spec 08: Estudo, destaques e notas no texto (pivô "modelo Bíblia Raízes", parte 2)

Aprovada pelo dono em 2026-10-01 (design guiado pela skill emil-design-eng). Parte 2 do
pivô descrito na spec 07; mexe só na tela de leitura `/study/bible/[book]/[chapter]`.

## Decisões do dono

- O destaque pinta o **versículo inteiro** (sem trecho solto).
- Destaques e notas são **privados de quem fez** (mesma regra de `study_text_notes`).
- Nota aparece no texto como **ícone discreto**, não aberta no meio da leitura, sem chave
  liga/desliga.

## Comportamento

1. **Tocar no número do versículo** abre um balão ancorado no número (hoje o toque abre a
   aba Versículo direto). O balão tem:
   - 5 cores: amarelo, verde, azul, rosa, laranja. Um toque pinta na hora (otimista, sem
     "salvar"). Tocar na cor já aplicada tira o destaque. A cor aplicada aparece marcada.
   - **Anotar**: abre a aba Notas com o versículo escolhido (`openNotes`, já existe).
   - **Estudar versículo**: o que o toque fazia antes (aba Versículo).
   - Fecha com Esc, toque fora ou depois de escolher uma ação. Funciona por teclado (Tab
     entre as opções, foco volta ao número ao fechar).
2. **Destaque** = fundo suave atrás do texto do versículo (`box-decoration-break: clone`
   para quebrar linha bonito). Tons por token, versão clara e escura; o texto nunca perde
   contraste. Coexiste com o sublinhado/realce das palavras do Interlinear.
3. **Lápis** pequeno, cor apagada, no fim do versículo que tem ao menos uma nota. Tocar
   abre a aba Notas naquele versículo; a aba mostra primeiro as notas desse versículo.
4. Salvar ou excluir uma nota atualiza o lápis no texto sem recarregar a página.
5. Falha ao gravar destaque: a cor volta ao estado anterior e aparece aviso curto.
6. Só no modo Bíblia. No modo Original nada muda.

## Movimento

- Balão: entra com o `popIn` existente (`--dur-micro`, escala 0.96 + opacidade), origem no
  número. Sai sem animação.
- Cor do destaque: `transition: background-color` curta. Nada mais anima.
- `prefers-reduced-motion`: balão só com fade (padrão já usado no arquivo).

## Dados

Tabela nova `study_highlights` (migration m55), privada por autor via RLS, igual a m37:

| coluna | tipo |
|---|---|
| id | uuid pk |
| org_id | uuid → organizations, cascade |
| author_id | uuid default auth.uid() → auth.users, cascade |
| book | text (OSIS, como as demais tabelas bíblicas) |
| chapter, verse | integer not null |
| color | text check in (`yellow`,`green`,`blue`,`pink`,`orange`) |
| updated_at | timestamptz default now() |

Único por (author_id, org_id, book, chapter, verse). Gravar = upsert; tirar = delete.

A página do capítulo carrega no servidor, junto com o texto: os destaques do capítulo e os
números de versículo que têm nota (RLS já devolve só os da pessoa).

## Fora do escopo

Destaque de trecho, nota compartilhada com a equipe, tela "meus destaques", editor rico
de nota (backlog), destaques no modo Original.

## Pronto quando

- `npm run verify` verde; teste unitário da lógica pura (cor alternada/removida, versículos
  com nota); e2e: pintar, trocar cor, tirar, anotar e ver o lápis.
- QA no navegador nos temas claro e escuro, desktop e celular.
- Migration aplicada no Supabase (pelo dono no SQL Editor, se o MCP negar).
