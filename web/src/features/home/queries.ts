// Assembler da Home — a última tela. AGREGAÇÃO pura no app: reusa o mesmo
// `buildSignalsInput` do Inbox (que já reúne sticks/groups/teams/services/events +
// presença/milestones) e soma orações, estudo e jornada. Tudo em paralelo no RSC,
// sem N+1, sem tabela/view nova. Ver docs/handoffs/home-supabase.md.
import type { DB } from "@/lib/auth/session";
import { buildSignalsInput, loadOverrides } from "@/features/inbox/queries";
import { listPrayers } from "@/features/prayer/queries";
import { listSermons, listSeries, listNotes } from "@/features/study/queries";
import { loadJourneyData } from "@/features/journey/queries";
import type { SignalsInput } from "@/features/signals/domain";
import type { Sermon, Series, StudyNote } from "@/features/study/types";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export interface StudySurface {
  lastSermon: Sermon | null;
  currentSeries: Series | null;
  recentNotes: StudyNote[];
}

export interface HomeData {
  input: SignalsInput;
  overrides: Map<string, string>;
  prayersAnswered: number; // respondidas no mês corrente
  movement30: number; // mudanças de estágio nos últimos 30 dias
  study: StudySurface;
}

// Último sermão: pregado mais recente (por data); senão o 1º da lista (já ordenada).
function pickLastSermon(sermons: Sermon[]): Sermon | null {
  const preached = sermons.filter((s) => s.status === "preached").slice().sort((a, b) => (b.sermon_date || "").localeCompare(a.sermon_date || ""));
  return preached[0] ?? sermons[0] ?? null;
}
// Série atual: ativa; senão em planejamento.
function pickCurrentSeries(series: Series[]): Series | null {
  return series.find((s) => s.status === "active") ?? series.find((s) => s.status === "planning") ?? null;
}

export async function loadHomeData(supabase: DB, orgId: string, activeCampus: string, now: Date): Promise<HomeData> {
  const [input, overrides, prayers, sermons, series, notes, journey] = await Promise.all([
    buildSignalsInput(supabase, orgId, activeCampus),
    loadOverrides(supabase, orgId),
    listPrayers(supabase, orgId),
    listSermons(supabase, orgId),
    listSeries(supabase, orgId),
    listNotes(supabase, orgId),
    loadJourneyData(supabase, orgId),
  ]);

  const ym = now.toISOString().slice(0, 7);
  const prayersAnswered = prayers.filter((p) => p.answered && p.answeredDate && p.answeredDate.slice(0, 7) === ym).length;
  const movement30 = journey.movementOccurredAts.filter((iso) => now.getTime() - new Date(iso).getTime() <= MONTH_MS).length;

  return {
    input,
    overrides: overrides as Map<string, string>,
    prayersAnswered,
    movement30,
    study: { lastSermon: pickLastSermon(sermons), currentSeries: pickCurrentSeries(series), recentNotes: notes.slice(0, 3) },
  };
}
