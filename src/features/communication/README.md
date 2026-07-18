# Comunicação (Fase 1)

O pastor manda uma mensagem para um público da igreja e vê o registro do que foi
enviado. Mesma pegada do Giving: feature isolada, gated por `communication.send`
(o RLS do banco é a barreira real).

## Fluxo

1. **Compor** (`MessageComposer`): assunto + corpo com `{nome}` → `preferred_name ||
   full_name` (substituído por destinatário no envio). Canal: e-mail (o enum guarda
   `in_app` para o futuro). Opcional: salvar/usar `message_templates`.
2. **Público** (`audience_kind` + `audience_ref`):
   - **Todos** — Sticks não arquivados (o consentimento filtra depois).
   - **Grupo** — `group_members.status = 'active'`.
   - **Signal** — por tipo/categoria ativo (`status ∉ resolved/dismissed`) →
     `related_stick_id`.
   - **Cuidado** — Sticks com `care_items` aberto (`status ∉ resolved/closed`). **Não
     expõe detalhe do Care** na UI nem no registro.
   - **Manual** — busca e marca Sticks.
3. **Pré-visualizar** (`resolveRecipients`): resolve o público, filtra por
   consentimento (só `email_allowed = true` e `email` não vazio) e mostra nº que
   recebe + nº pulado, com a lista. Ninguém sai sem aparecer aqui.
4. **Registrar** (`queueMessage`): cria `messages` (status `queued`) + uma linha por
   destinatário em `message_recipients` (`pending` com snapshot `to_name`/`to_email`;
   pulados como `skipped` com o motivo em `error`). **Não envia e-mail de verdade** —
   a entrega é passo posterior do orquestrador. O botão é "Preparar envio".
5. **Histórico** (`MessageLog` + `/communication/[id]`): lista as `messages` (recentes
   primeiro, reusa `PeriodFilter`) com status e contagem; abrir uma mostra os
   `message_recipients` com status.

## Arquivos

- `types.ts` — formas de front (sem I/O).
- `domain.ts` — **puro** e testado: `displayName`, `applyPlaceholder`,
  `partitionByConsent`, rótulos, `storableAudienceRef` (recorte seguro; Care → `{}`).
- `schema.ts` — validação da composição (fronteira de Server Action).
- `access.ts` — `canSendCommunication(ctx)` (server-only, síncrono).
- `queries.ts` — leituras: opções de público, `resolveCandidates`, histórico, detalhe.
- `actions.ts` — `resolveRecipients`, `queueMessage`, `saveTemplate` (`use server`).
- `components/` — `CommunicationBoard`, `MessageComposer`, `MessageLog`.
- `domain.test.ts` — testes do domínio puro.

## Notas

- A entrega real (integração com provedor de e-mail) é do orquestrador — Fase 1 só
  registra. A tela deixa isso claro.
- O banco (tabelas `messages`, `message_recipients`, `message_templates`) é do
  orquestrador; RLS por `communication.send`.
