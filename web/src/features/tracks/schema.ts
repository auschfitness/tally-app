// Validação/coerção de entrada (fronteira do servidor). Nome é obrigatório;
// descrição e tipo são opcionais. `status` da trilha nasce "active" (legado) e não
// é editável nesta fatia — não fica na entrada.
export interface TrackInput {
  name: string;
  description: string;
  type: string;
}
export type ValidatedTrack =
  | { ok: true; data: TrackInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseTrackInput(fd: FormData): ValidatedTrack {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome à trilha."] } };
  return {
    ok: true,
    data: {
      name,
      description: String(fd.get("description") ?? "").trim(),
      type: String(fd.get("type") ?? "").trim(),
    },
  };
}
