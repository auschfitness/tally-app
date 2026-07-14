export interface PostInput { title: string; body: string; team: string }
export interface TaskInput { text: string; who: string }

export type Validated<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string[]> };

export function parsePostInput(formData: FormData): Validated<PostInput> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, fieldErrors: { title: ["Informe um título."] } };
  return {
    ok: true,
    data: { title, body: String(formData.get("body") ?? "").trim(), team: String(formData.get("team") ?? "").trim() || "Geral" },
  };
}

export function parseTaskInput(formData: FormData): Validated<TaskInput> {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { ok: false, fieldErrors: { text: ["Descreva a tarefa."] } };
  return { ok: true, data: { text, who: String(formData.get("who") ?? "").trim() } };
}
