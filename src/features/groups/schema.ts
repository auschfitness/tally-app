export interface GroupInput {
  name: string;
  leaderStickId: string;
  campus: string;
  day: string;
  time: string;
}

export type Validated =
  | { ok: true; data: GroupInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseGroupInput(formData: FormData): Validated {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, fieldErrors: { name: ["Dê um nome ao grupo."] } };
  return {
    ok: true,
    data: {
      name,
      leaderStickId: String(formData.get("leaderStickId") ?? "").trim(),
      campus: String(formData.get("campus") ?? "").trim(),
      day: String(formData.get("day") ?? "").trim(),
      time: String(formData.get("time") ?? "").trim(),
    },
  };
}
