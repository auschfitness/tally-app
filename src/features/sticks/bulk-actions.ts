"use server";

// Server Actions de Pessoas em volume (spec 13, fase B): importar planilha em lotes, exportar
// CSV e listas salvas. Mesmo contrato de actions.ts: sessão/org/permissão no servidor, entrada
// revalidada (o navegador pode mandar qualquer coisa), RLS como barreira final.
import { requireOrg, can, type DB, type OrgContext } from "@/lib/auth/session";
import { type ActionResult, ok, fail, toMessage } from "@/lib/errors";
import { canEditPeople } from "./access";
import { FIELD_META, NO_FILTERS, filtersQuery, hasFilters, normalize, onlyDigits, positionForJourneyCode, type PeopleFilters } from "./domain";
import { peopleCsv, type ExportPerson } from "./export";
import { BATCH_SIZE, DOC_FIELDS, cleanValues, type ImportValues } from "./import";
import { asRelationship, filtersFromJson } from "./queries";
import type { SavedList } from "./types";

const DENIED = "Você não tem permissão para editar pessoas.";
const PAGE = 1000; // limite de linhas por consulta do PostgREST

async function editorOrg(): Promise<{ ctx: OrgContext } | { error: ActionResult<never> }> {
  const ctx = await requireOrg();
  return canEditPeople(ctx) ? { ctx } : { error: fail(DENIED) };
}

const today = (): string => new Date().toISOString().slice(0, 10);

// Lê uma tabela inteira, de mil em mil (ordem fixa para a paginação não repetir linha).
async function pageAll<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await read(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE) return out;
  }
}

async function stageFor(supabase: DB, code: string): Promise<string | null> {
  const { data } = await supabase.from("journey_stages").select("id").eq("position", positionForJourneyCode(code)).limit(1).maybeSingle();
  return data?.id ?? null;
}

const STICK_COLUMNS =
  "id, full_name, relationship_status, phone, whatsapp, email, birth_date, gender, marital_status, address_line_1, address_line_2, city, state, postal_code, baptism_date, membership_date, church_office, profession";
interface StickRow {
  id: string;
  full_name: string;
  relationship_status: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  baptism_date: string | null;
  membership_date: string | null;
  church_office: string | null;
  profession: string | null;
}
interface DocRow {
  stick_id: string;
  cpf: string | null;
  rg: string | null;
}

// ---- Importar -----------------------------------------------------------------------------

// Nomes (sem acento) e CPFs que a igreja já tem: a prévia da importação usa isto para contar
// "novas" e "já existem". CPF só chega para quem tem members.manage (o RLS não devolve linha).
export async function existingKeysAction(): Promise<ActionResult<{ names: string[]; cpfs: string[] }>> {
  const g = await editorOrg();
  if ("error" in g) return g.error;
  const { supabase, orgId } = g.ctx;
  try {
    const [sticks, docs] = await Promise.all([
      pageAll<{ full_name: string }>((a, b) => supabase.from("sticks").select("full_name").eq("org_id", orgId).order("id").range(a, b)),
      pageAll<{ cpf: string | null }>((a, b) => supabase.from("stick_documents").select("cpf").eq("org_id", orgId).order("stick_id").range(a, b)),
    ]);
    return ok({ names: sticks.map((s) => normalize(s.full_name)), cpfs: docs.flatMap((d) => (d.cpf ? [d.cpf] : [])) });
  } catch (e) {
    return fail(toMessage(e));
  }
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: { line: number; message: string }[];
}

// Um lote (até 200 linhas). `skip`: quem já existe (mesmo nome ou CPF) fica como está.
// `fill`: quem já existe recebe só os campos que estavam vazios. Novas entram como Membro.
export async function importPeopleAction(rows: { line: number; values: ImportValues }[], mode: "skip" | "fill"): Promise<ActionResult<ImportSummary>> {
  const g = await editorOrg();
  if ("error" in g) return g.error;
  const { ctx } = g;
  const { supabase, orgId } = ctx;
  if (!Array.isArray(rows) || rows.length > BATCH_SIZE) return fail(`Envie no máximo ${BATCH_SIZE} linhas por vez.`);
  if (mode !== "skip" && mode !== "fill") return fail("Modo inválido.");
  const canDocs = can(ctx, "members.manage");
  const day = today();

  try {
    const [sticks, docs] = await Promise.all([
      pageAll<StickRow>((a, b) => supabase.from("sticks").select(STICK_COLUMNS).eq("org_id", orgId).order("id").range(a, b)),
      canDocs
        ? pageAll<DocRow>((a, b) => supabase.from("stick_documents").select("stick_id, cpf, rg").eq("org_id", orgId).order("stick_id").range(a, b))
        : Promise.resolve([] as DocRow[]),
    ]);
    const byId = new Map<string, Partial<StickRow>>(sticks.map((s) => [s.id, s]));
    const byName = new Map<string, string>(sticks.map((s) => [normalize(s.full_name), s.id]));
    const docOf = new Map<string, DocRow>(docs.map((d) => [d.stick_id, d]));
    const byCpf = new Map<string, string>(docs.flatMap((d) => (d.cpf ? [[d.cpf, d.stick_id] as [string, string]] : [])));

    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };
    const inserts: Record<string, unknown>[] = [];
    const docRows: { stick_id: string; org_id: string; cpf?: string; rg?: string }[] = [];
    const patches: { id: string; patch: Record<string, unknown>; doc: { cpf?: string; rg?: string } }[] = [];
    const stageId = await stageFor(supabase, "connected");

    for (const row of rows) {
      const { values, error } = cleanValues(row.values ?? {}, day);
      if (error) {
        summary.errors.push({ line: Number(row.line) || 0, message: error });
        continue;
      }
      if (!canDocs) for (const f of DOC_FIELDS) delete values[f];
      const cpf = onlyDigits(values.cpf ?? "");
      const nameKey = normalize(values.name ?? "");
      const matchId = (cpf && byCpf.get(cpf)) || byName.get(nameKey) || null;

      if (matchId) {
        const cur = byId.get(matchId);
        const patch: Record<string, unknown> = {};
        const doc: { cpf?: string; rg?: string } = {};
        if (mode === "fill" && cur) {
          for (const [field, v] of Object.entries(values) as [keyof ImportValues, string][]) {
            if (field === "name") continue;
            if (field === "cpf" || field === "rg") {
              if (!docOf.get(matchId)?.[field]) doc[field] = v;
              continue;
            }
            const column = FIELD_META[field].column as keyof StickRow;
            if (!cur[column]) patch[column] = v;
          }
        }
        if (Object.keys(patch).length === 0 && Object.keys(doc).length === 0) {
          summary.skipped++;
          continue;
        }
        patches.push({ id: matchId, patch, doc });
        // o que acabou de ser preenchido já conta como preenchido para as próximas linhas
        if (cur) Object.assign(cur, patch);
        if (doc.cpf) byCpf.set(doc.cpf, matchId);
        docOf.set(matchId, { stick_id: matchId, cpf: doc.cpf ?? docOf.get(matchId)?.cpf ?? null, rg: doc.rg ?? docOf.get(matchId)?.rg ?? null });
        summary.updated++;
        continue;
      }

      const id = crypto.randomUUID();
      const rec: Record<string, unknown> = { id, org_id: orgId, relationship_status: "member", source: "Importado de planilha", journey_stage_id: stageId };
      for (const [field, v] of Object.entries(values) as [keyof ImportValues, string][]) {
        const column = FIELD_META[field].column;
        if (column) rec[column] = v;
      }
      inserts.push(rec);
      if (values.cpf || values.rg) docRows.push({ stick_id: id, org_id: orgId, ...(values.cpf ? { cpf: values.cpf } : {}), ...(values.rg ? { rg: values.rg } : {}) });
      byName.set(nameKey, id); // a próxima linha igual, neste lote, já "existe"
      byId.set(id, {});
      if (cpf) byCpf.set(cpf, id);
      summary.created++;
    }

    if (inserts.length) {
      const ins = await supabase.from("sticks").insert(inserts as never);
      if (ins.error) return fail(toMessage(ins.error, "Não consegui importar este lote."));
    }
    if (docRows.length) {
      const d = await supabase.from("stick_documents").insert(docRows);
      if (d.error) return fail(toMessage(d.error, "As pessoas entraram, mas não consegui guardar os documentos."));
    }
    const stamp = new Date().toISOString();
    for (let i = 0; i < patches.length; i += 20) {
      const res = await Promise.all(
        patches.slice(i, i + 20).map(async ({ id, patch, doc }) => {
          const a = Object.keys(patch).length ? await supabase.from("sticks").update({ ...patch, updated_at: stamp }).eq("org_id", orgId).eq("id", id) : null;
          const b = Object.keys(doc).length ? await supabase.from("stick_documents").upsert({ stick_id: id, org_id: orgId, ...doc, updated_at: stamp }, { onConflict: "stick_id" }) : null;
          return a?.error ?? b?.error ?? null;
        }),
      );
      const bad = res.find(Boolean);
      if (bad) return fail(toMessage(bad, "Não consegui completar a atualização."));
    }
    return ok(summary);
  } catch (e) {
    return fail(toMessage(e));
  }
}

// ---- Exportar -----------------------------------------------------------------------------

// CSV das pessoas pedidas (na ordem dada). CPF e RG só entram para quem tem members.manage.
export async function exportPeopleAction(ids: string[]): Promise<ActionResult<{ csv: string; filename: string; count: number }>> {
  const ctx = await requireOrg();
  const { supabase, orgId } = ctx;
  if (!Array.isArray(ids) || ids.length > 20000) return fail("Lista inválida.");
  const canDocs = can(ctx, "members.manage");
  try {
    const [sticks, docs] = await Promise.all([
      pageAll<StickRow>((a, b) => supabase.from("sticks").select(STICK_COLUMNS).eq("org_id", orgId).order("id").range(a, b)),
      canDocs
        ? pageAll<DocRow>((a, b) => supabase.from("stick_documents").select("stick_id, cpf, rg").eq("org_id", orgId).order("stick_id").range(a, b))
        : Promise.resolve([] as DocRow[]),
    ]);
    const byId = new Map(sticks.map((s) => [s.id, s]));
    const docOf = new Map(docs.map((d) => [d.stick_id, d]));
    const people: ExportPerson[] = ids.flatMap((id) => {
      const s = byId.get(id);
      if (!s) return [];
      const d = docOf.get(id);
      return [
        {
          name: s.full_name,
          status: asRelationship(s.relationship_status),
          office: s.church_office ?? "",
          phone: s.phone ?? "",
          whatsapp: s.whatsapp ?? "",
          email: s.email ?? "",
          birthDate: s.birth_date,
          gender: s.gender ?? "",
          maritalStatus: s.marital_status ?? "",
          profession: s.profession ?? "",
          line1: s.address_line_1 ?? "",
          line2: s.address_line_2 ?? "",
          city: s.city ?? "",
          state: s.state ?? "",
          postalCode: s.postal_code ?? "",
          baptismDate: s.baptism_date,
          membershipDate: s.membership_date,
          cpf: d?.cpf ?? "",
          rg: d?.rg ?? "",
        },
      ];
    });
    return ok({ csv: peopleCsv(people, canDocs), filename: `pessoas-${today()}.csv`, count: people.length });
  } catch (e) {
    return fail(toMessage(e));
  }
}

// ---- Listas salvas ------------------------------------------------------------------------

function cleanName(name: string): string | null {
  const n = (name ?? "").trim();
  return n.length >= 1 && n.length <= 80 ? n : null;
}
// Só as chaves em uso, no formato da querystring.
function storable(f: PeopleFilters): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(filtersQuery(f)));
}

export async function createPeopleListAction(name: string, filters: unknown): Promise<ActionResult<SavedList>> {
  const g = await editorOrg();
  if ("error" in g) return g.error;
  const { supabase, orgId } = g.ctx;
  const n = cleanName(name);
  if (!n) return fail("Dê um nome de até 80 letras à lista.");
  const f = { ...NO_FILTERS, ...filtersFromJson(filters) };
  if (!hasFilters(f)) return fail("Escolha algum filtro antes de salvar a lista.");
  const { data, error } = await supabase.from("people_lists").insert({ org_id: orgId, name: n, filters: storable(f) }).select("id").single();
  return error || !data ? fail(toMessage(error, "Não consegui salvar a lista.")) : ok({ id: data.id, name: n, filters: f });
}

export async function renamePeopleListAction(id: string, name: string): Promise<ActionResult<{ name: string }>> {
  const g = await editorOrg();
  if ("error" in g) return g.error;
  const n = cleanName(name);
  if (!n) return fail("Dê um nome de até 80 letras à lista.");
  const { error } = await g.ctx.supabase.from("people_lists").update({ name: n }).eq("org_id", g.ctx.orgId).eq("id", id);
  return error ? fail(toMessage(error, "Não consegui renomear.")) : ok({ name: n });
}

export async function deletePeopleListAction(id: string): Promise<ActionResult> {
  const g = await editorOrg();
  if ("error" in g) return g.error;
  const { error } = await g.ctx.supabase.from("people_lists").delete().eq("org_id", g.ctx.orgId).eq("id", id);
  return error ? fail(toMessage(error, "Não consegui apagar a lista.")) : ok(undefined);
}
