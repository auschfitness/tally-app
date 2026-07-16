// Tipos da feature Inbox. O Inbox é ENGINE-DERIVED: os Signals vêm do motor puro
// (features/signals/domain.ts) calculado ao vivo; o STATUS de cada um persiste em
// `signal_overrides` (por `signal_key`). A tabela `signals` NÃO é a fonte (reservada
// para persistência futura). Ver docs/handoffs/inbox-supabase.md.

// Status por signal. O motor conhece new|seen|dismissed; o Inbox (como o legado)
// também usa `snoozed` (Adiar) e `assigned` (virou Care) — `signal_overrides.status`
// é texto livre, então preservamos os cinco. Só new/seen aparecem no feed.
export type InboxStatus = "new" | "seen" | "snoozed" | "assigned" | "dismissed";

// Mapa signal_key → status (o que o Inbox lê de signal_overrides).
export type OverridesMap = Map<string, InboxStatus>;

export interface CategoryDef {
  key: string; // "all" | SignalCategory
  label: string;
}
