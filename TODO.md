# TODO / Backlog

> **Governor**: @project-manager — invoke for sprint planning, prioritization, and feature breakdown
> **Agents**: May add items to "Backlog" and move completed items to "Completed". Preserve section order. Never reorder items within a section — priority position is set by humans or @project-manager when explicitly asked.

---

## In Progress

- [ ] (WIP) #001 — [Short description of what's currently being worked on] [area: setup] → [.tasks/001-short-title.md](.tasks/001-short-title.md)

---

## Up Next (prioritized)

- [ ] #002 — [Short description] [area: backend] → [.tasks/002-short-title.md](.tasks/002-short-title.md)
- [ ] #003 — [Short description] [area: frontend] → [.tasks/003-short-title.md](.tasks/003-short-title.md)
- [ ] #004 — [Short description] [area: database] → [.tasks/004-short-title.md](.tasks/004-short-title.md)
- [ ] #001 — Banco da leitura: migrations m53/m54 + flag study.reader + tipos [area: database] → [.tasks/001-banco-leitura-m53-m54.md](.tasks/001-banco-leitura-m53-m54.md)
- [ ] #002 — Regras puras + leituras do servidor [area: backend] → [.tasks/002-regras-puras-leituras-servidor.md](.tasks/002-regras-puras-leituras-servidor.md)
- [ ] #003 — Dados de João: ligação PT↔grego + glosas PT [area: backend] → [.tasks/003-dados-joao-pt-grego-glosas.md](.tasks/003-dados-joao-pt-grego-glosas.md)
- [ ] #004 — Tela: rota, texto, chave/balão, área de trabalho, abas Versículo/Notas/Sermão [area: frontend] → [.tasks/004-tela-rota-texto-chave-notas-sermao.md](.tasks/004-tela-rota-texto-chave-notas-sermao.md)
- [ ] #005 — Carga dos dados com service_role + revisão por amostra de João 1 [area: backend] → [.tasks/005-carga-dados-revisao-joao-1.md](.tasks/005-carga-dados-revisao-joao-1.md)
- [ ] #006 — E2E + verify + docs + revisão final [area: qa] → [.tasks/006-e2e-verify-docs-revisao-final.md](.tasks/006-e2e-verify-docs-revisao-final.md)

---

## Backlog

- [ ] #005 — [Short description] [area: frontend] → [.tasks/005-short-title.md](.tasks/005-short-title.md)
- [ ] #006 — [Short description] [area: backend] → [.tasks/006-short-title.md](.tasks/006-short-title.md)
- [ ] #007 — [Short description] [area: docs] → [.tasks/007-short-title.md](.tasks/007-short-title.md)
- [ ] #008 — [Short description] [area: qa] → [.tasks/008-short-title.md](.tasks/008-short-title.md)

---

## Completed

- [x] #000 — Initial project setup and template configuration → [.tasks/000-initial-project-setup.md](.tasks/000-initial-project-setup.md)

---

## Item Format Guide

When adding new items, use this format:

```
- [ ] #NNN — Brief description of the task [area: frontend|backend|database|qa|docs|infra|design] → [.tasks/NNN-short-title.md](.tasks/NNN-short-title.md)
```

Every TODO item must have a corresponding `.tasks/NNN-*.md` file. @project-manager creates both together.

**Area tags** help agents know which specialist to use:
- `frontend` → @frontend-developer
- `backend` → @backend-developer
- `database` → @database-expert
- `design` → @ui-ux-designer
- `qa` → @qa-engineer
- `docs` → @documentation-writer
- `infra` → @systems-architect
- `setup` → general

**Priority**: Items higher in "Up Next" are higher priority. Agents move completed items to "Completed" and may add new items to "Backlog". Only humans reorder items within a section to change priority, unless explicitly asked to reprioritize.
