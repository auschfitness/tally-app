// Modelos de domínio de Trilhas (Discipleship Tracks). Uma trilha tem etapas
// ordenadas (`track_steps.position`) e matrículas por Stick (`track_enrollments`).
// Progresso é PARTICIPAÇÃO (etapas concluídas), nunca nota. Ver
// docs/handoffs/study-trilhas-supabase.md.
//
// `status` (track e enrollment) é TEXTO no banco (não enum): não coagimos a um
// conjunto fechado — preservamos o valor do legado ("active" / "in_progress" /
// "completed") e só tratamos "completed" com significado especial na UI.

export interface TrackStep {
  id: string;
  track_id: string;
  name: string;
  description: string;
  position: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  steps: TrackStep[];
}

export interface Enrollment {
  id: string;
  track_id: string;
  stick_id: string;
  current_step_id: string | null;
  progress: number;
  status: string; // "in_progress" | "completed" (texto livre no banco)
  started_at: string | null;
  completed_at: string | null;
}

// Opção de pessoa para o select de matrícula (Stick não arquivada do campus ativo).
export interface PersonOption {
  id: string;
  name: string;
}

// Sermão vinculado como material de ensino (via content.track_id) — só leitura,
// leva ao editor de Estudo. Shape mínimo (a fonte é a feature Study já migrada).
export interface TeachingSermon {
  id: string;
  title: string;
  main_passage: string;
}
