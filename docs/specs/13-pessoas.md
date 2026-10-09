# Spec 13. Pessoas (módulo 1 do roadmap)

Aprovada pelo dono em 2026-10-09. Referência de produto: tribusapp.com/funcionalidades ("Gestão de Pessoas", "Listas Dinâmicas", "Batismos").
Só gestão (pastor/secretaria). Nada de autoatendimento do membro nesta spec.

Regras de sempre: texto em PT-BR, sem travessão longo, sem emoji. Régua 4d + decisões da tarefa 8 (botão de texto em pílula, `--r-6` controles, `--r-10` painéis, sem borda em repouso, 5 tamanhos de texto, Lucide 16/1.75 via `UiIcon`, verde só em ação primária/link). Sem `style={{}}` inline (exceto variável CSS). Hover só em `@media (hover:hover) and (pointer:fine)`. Nada nativo do Windows (ver fim de `globals.css`; usar `Select`, `DateField` de `src/components/shared`).

Na tela o nome é **Pessoas** (nunca "Sticks"). No código a feature continua `src/features/sticks/` e a tabela `sticks`.

## Banco (JÁ APLICADO no Supabase: `supabase/migrations/20261009160000_m66_pessoas.sql`, leia antes)

- `sticks` ganhou: `marital_status` (single|married|stable_union|divorced|widowed), `profession`, `church_office` (texto livre), `admission_type` (baptism|transfer|acclamation|reconciliation|other), `exit_date`, `exit_reason` (transfer|moved|deceased|requested|dismissed). Já existiam e passam a aparecer: `phone`, `whatsapp`, `email`, `birth_date`, `gender`, `address_line_1/2`, `city`, `state`, `postal_code`, `profile_photo` (caminho no bucket), `first_visit_date`, `conversion_date`, `baptism_date`, `membership_date`, `relationship_status` (visitor_first|visitor_returning|attendee|member|inactive), `is_leader`, `archived`.
- `stick_documents (stick_id, org_id, cpf só dígitos 11, rg)`: RLS só `members.manage`. Quem não tem a permissão simplesmente não recebe linha: a UI esconde a seção Documentos.
- `households` ganhou endereço (`address_line_1/2, city, state, postal_code`). `household_members.relationship_type` = head|spouse|child|other, uma família por pessoa (unique em stick_id).
- `people_lists (id, org_id, name, filters jsonb)`: `filters` = o mesmo objeto da querystring da lista.
- Bucket privado `people-photos`, caminho `<org_id>/<stick_id>.<ext>`, até 5 MB, jpeg/png/webp/heic. Ler = equipe; gravar = `can_edit_people`.
- RLS: ler fichas = equipe (`is_org_staff`) ou a própria; gravar = `members.manage` ou `sticks.edit`. No app, quem pode editar = `can(ctx,"members.manage") || can(ctx,"sticks.edit")`.
- Atualizar `src/lib/database.types.ts` à mão com as colunas/tabelas novas.

Rótulos PT: estado civil Solteiro(a)/Casado(a)/União estável/Divorciado(a)/Viúvo(a). Entrada: Batismo/Transferência/Aclamação/Reconciliação/Outra. Saída: Transferência/Mudança/Falecimento/A pedido/Desligamento. Situação: Visitante (visitor_first e visitor_returning)/Frequentador/Membro/Inativo. Família: Responsável/Cônjuge/Filho(a)/Outro. Sugestões de cargo: Membro, Diácono(isa), Presbítero, Pastor(a), Evangelista, Missionário(a), Líder de ministério.

## Fase A. Lista + ficha (um commit por item)

A1. **Menu e rotas.** `src/config/nav.ts`: item `{ key:"people", label:"Pessoas", href:"/people", icon:"people", match:["/people"] }` em `STUDY_ITEMS` antes de Finanças, `/people` em `STUDY_ONLY_KEEPS`, ícone Lucide `Users` no `Sidebar`. Rota nova `src/app/(dashboard)/people/` (page + `[id]/page.tsx`). `/sticks` redireciona para `/people` (mantendo querystring). Garantir que o middleware não redireciona `/people` para o Estudo.

A2. **Dados.** `queries.ts`: `listPeople` (campos da lista) e `getPerson(id)` (ficha inteira + família com membros + documentos se houver + resumo de dízimos do ano corrente via `donations` por `stick_id`: total e quantidade). Tipos em `types.ts`. Lógica pura em `domain.ts` (rótulos, `filterPeople`, `birthdaysIn(month)`, idade, formatação de CPF/telefone, validação de CPF com dígito verificador) com testes em `domain.test.ts`.

A3. **Lista** (`components/PeopleList.tsx`, CSS em `sticks/people.module.css`). Copiar o padrão de Sermões (`src/features/study/components/SermonLibrary.tsx`, chips + `Popover.tsx`):
- Cabeçalho "Pessoas" + contagem `--text-2` + botão "Nova pessoa" (primária, pílula) + menu `MoreHorizontal` com "Importar planilha" e "Exportar lista" (Fase B; na Fase A deixar o menu só se já tiver item funcional).
- Busca em pílula (nome, telefone, e-mail). Chips exclusivos: Todos · Membros · Frequentadores · Visitantes · Inativos. Chips com popover que somam: `Cargo ▾` (cargos em uso), `Aniversário ▾` (Este mês, Próximo mês), `Célula ▾` (grupos via `group_members`, mais "Sem célula").
- Filtros na URL (`?s=member&cargo=Diácono&aniv=este&celula=<id>&q=`) com `history.replaceState`.
- Linha: avatar 32px (foto via signed URL ou iniciais em `--surface-2`), nome `--t-15`/500, abaixo `--t-13 --text-2` "Membro · Diácono · (47) 99999-0000"; à direita aniversário quando o filtro de aniversário está ligado ("12 out"). Divisória 1px `--border` .6. Vazio: "Nenhuma pessoa ainda." + "Nova pessoa" e "Importar planilha".
- Arquivados (`archived`) fora da lista, exceto com o chip Inativos.

A4. **Ficha** (`components/PersonProfile.tsx`). Computador >= 900px: lista à esquerda (360px) e ficha à direita, igual Notas (`src/features/study/components/NotesLibrary.tsx`: seleção em `?p=<id>` com replaceState; `/people/[id]` abre direto). Celular: lista; tocar abre a ficha em tela cheia entrando da direita (mesmo movimento e gesto de voltar de Notas, `pushState`/`popstate`).
- Cabeçalho: foto 64px (clicar troca a foto, se pode editar), nome `--t-22`/600, linha `--t-13 --text-2` situação · cargo · idade. Ações: "Imprimir ficha", "Certificado de batismo" (só com `baptism_date`), menu `MoreHorizontal` com "Registrar saída" e "Arquivar".
- Seções (título `--t-13`/500 `--text-2` maiúsculas não; só peso), cada uma some se vazia E o usuário não pode editar: **Contato** (telefone, WhatsApp com link wa.me, e-mail) · **Dados pessoais** (nascimento com idade, sexo, estado civil, profissão) · **Documentos** (CPF formatado, RG; só se pode ver) · **Endereço** · **Família** · **Vida na igreja** (situação, primeira visita, conversão, batismo, forma de entrada, membro desde, cargo, líder; saída e motivo se houver) · **Dízimos** (`<ano>: R$ X em N contribuições` + link "Ver em Finanças" para `/finance?tab=dizimos`, só para quem tem `finance.manage`).
- Edição no lugar: cada campo é texto; clicar (se pode editar) vira input; salva ao sair do campo ou Enter, Esc cancela; indicador "Salvo" `--t-11` como em Notas. Uma Server Action `updatePersonFieldAction(id, field, value)` com whitelist de campos e validação (zod em `schema.ts`); CPF vai para `stick_documents` (upsert). CPF inválido = erro no campo, não salva.
- **Família**: lista os membros (nome clicável abre a ficha, papel ao lado). Sem família: "Adicionar à família" abre popover com busca de pessoa ("Juntar à família de <nome>", cria a família se a outra pessoa não tiver, nome "Família <sobrenome>") ou "Criar família". Trocar papel e "Tirar da família". Endereço da família: se a pessoa não tem endereço próprio, mostra o da família com a nota "Endereço da família". Botão "Usar este endereço para todos da família" copia para `households`.
- **Foto**: upload direto ao bucket (padrão de `src/features/finance/file-actions.ts`: signed upload URL), reduzir no cliente para 512px JPEG antes (canvas), grava o caminho em `profile_photo`.
- **Nova pessoa**: cria ficha só com nome (situação padrão Visitante) e abre a ficha nova com o foco no nome. Some o `PersonModal` antigo se ninguém mais usar (grep) e o `SticksBoard` (substituído).
- **Registrar saída**: popover com data e motivo; grava `exit_date`, `exit_reason`, `relationship_status='inactive'`.

A5. **Verificação Fase A**: `npm run verify` sem servidor no ar (integração com "JWT issued at future" = reexecutar só ela com `--no-file-parallelism`). E2E novo `e2e/people.spec.ts`: criar pessoa, editar telefone, buscar, filtrar Membros, abrir ficha por URL. Ajustar e2e que quebrar. Prévias `docs/previews/13a-*.png` (lista e ficha, 1280 e 390, claro e escuro) com spec/config temporários sem webServer na porta 3010 (ver memória do fluxo nas tarefas 8/9 do AGENTS.md), apagando os temporários.

## Fase B. Importar, exportar, listas salvas, impressão

B1. **Importar planilha** (`components/ImportPeople.tsx`, lógica pura `import.ts` com testes). Aceita CSV (`;` ou `,`, UTF-8 ou Latin-1) e XLSX se já houver lib instalada (checar `package.json`; se não houver, só CSV e o texto diz "Salve a planilha como CSV"). Passos numa folha/painel: 1) escolher arquivo; 2) mapear colunas com palpite automático por cabeçalho (nome, nome completo, celular, telefone, whatsapp, e-mail, nascimento, data de nascimento, sexo, estado civil, endereço, bairro, cidade, uf, cep, cpf, rg, batismo, membro desde, cargo, profissão), cada coluna com `Select` "Ignorar" ou campo; 3) prévia das 5 primeiras linhas e contagem: "X novas, Y já existem (mesmo nome ou CPF), Z com erro"; já existentes: escolha única "Pular" (padrão) ou "Atualizar campos vazios"; 4) importar em lotes de 200 via Server Action, barra de progresso, resumo final. Datas `dd/mm/aaaa`, `aaaa-mm-dd`, `dd/mm/aa`; reaproveitar `csvDate` de `src/features/finance/statement.ts` se servir. Só `can_edit_people`.

B2. **Exportar**: botão no menu "···" e em cada lista salva: CSV `;` com BOM UTF-8 (Excel BR), colunas legíveis em PT, da lista filtrada atual. CPF/RG só entram se o usuário tem `members.manage`.

B3. **Listas salvas**: com qualquer filtro/busca ativo aparece "Salvar lista" (botão ghost) que pede o nome num popover. Listas salvas aparecem como linha de atalhos acima dos chips (chip com o nome; clicar aplica os filtros; menu com Renomear/Apagar). Sugeridas quando a igreja não tem nenhuma: não criar automaticamente.

B4. **Impressão**: rota `/people/[id]/ficha` e `/people/[id]/batismo`, página limpa no padrão de `src/features/giving/components/ReceiptView.tsx` / `PulpitView.tsx` (`@media print`, botão "Imprimir" que some na impressão, A4).
- Ficha cadastral: nome da igreja no topo, foto, todos os campos da ficha em duas colunas, família, linha de assinatura e data.
- Certificado de batismo: A4 paisagem, sóbrio, Literata no nome. Texto: "Certificamos que **<nome>** foi batizado(a) nas águas em <data por extenso>, na <nome da igreja>, em <cidade>/<UF>." (cidade/UF da igreja se houver, senão omite a parte), duas linhas de assinatura "Pastor(a)" e "Secretário(a)". Gênero ajusta batizado/batizada quando `gender` existe; senão "batizado(a)".

B5. **Verificação Fase B**: igual A5, com teste de `import.ts` (mapeamento por cabeçalho, datas, duplicados) e e2e de importar um CSV pequeno de `e2e/fixtures/pessoas.csv`. Prévias `docs/previews/13b-*.png` (importação passo 3, lista salva, ficha impressa, certificado).

## Entrega
Commits na branch, um por item, mensagem `feat(people): ...`. NÃO publicar na main: prévias para o dono aprovar.
