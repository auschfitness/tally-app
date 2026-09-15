# Specs v2 — como rodar

Pacote de reformulação do Tally. Cada arquivo é escrito para ser **consumido por um
agente do Claude Code**, não por humano. Uma sessão lê **um spec só**.

## Ordem obrigatória

```
FASE 0 (serial, bloqueia tudo)   00-fundacao.md
FASE 1 (paralelo, 4 agentes)     01-finance-ofx.md  02-study-biblia.md
                                 03-teams.md        04-groups.md
FASE 2 (serial)                  05-billing.md
```

**Não pule a Fase 0.** Ela entrega o sistema de feature flags e os tokens de design.
Sem ela, cada agente da Fase 1 inventa o próprio jeito de esconder feature incompleta
e o próprio visual — que é exatamente como o app chegou no estado atual.

A Fase 1 paraleliza com segurança porque o repo é fatiado por feature: cada agente
mexe só em `src/features/<x>/` + sua rota em `src/app/(dashboard)/<x>/`. Arquivos
disjuntos, zero conflito de merge.

## Protocolo de sessão (economia de token)

1. Uma sessão = um spec = um módulo. `/clear` entre módulos, sempre.
2. Comece em plan mode (`shift+tab`). Aprove o plano antes de deixar escrever.
3. O agente lê: este README + o spec dele + `src/features/<x>/**` + `docs/design-tokens.md`.
   **Não** lê o repo inteiro. Se precisar procurar fora, usa subagente — o custo da
   busca morre no subagente e só a resposta volta.
4. Ao terminar: `npm run verify` verde, atualiza o `README.md` da feature, para.
5. Commit por módulo. Nunca um commit gigante.

## Regras que valem para todos os agentes

- **TypeScript estrito.** Sem `any`, sem `@ts-ignore`.
- **Toda feature nova nasce atrás de flag** (ver 00-fundacao). Flag desligada em produção
  até o dono aprovar visualmente.
- **Não invente dado.** DNA #2 do projeto: nada de gráfico com número ilustrativo. Se não
  há histórico, o gráfico mostra vazio com estado explicativo.
- **Preserve o que funciona.** Refatorar não é reescrever. Se um comportamento existe e
  não está na lista de problemas, ele continua igual.
- **RLS é a fronteira de segurança**, feature flag e plano são comerciais. Nunca troque um
  pelo outro.
- Interface em PT-BR. Termos que não traduzem: Stick, Signal, Care, Journey, Milestone,
  Inbox, Timeline.
