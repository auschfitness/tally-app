// Modelos de domínio de Care (cuidado pastoral). Ver docs/handoffs/care-supabase.md.
//
// ⚠️ IDs de PESSOA divergem por papel:
//  - `stick_id` (item/contato) = a PESSOA CUIDADA → resolve por `sticks`.
//  - `assigned_to`/`author_id`/`contacted_by` = o RESPONSÁVEL/AUTOR (staff) →
//    são de `auth.users`, resolvidos por `profiles`/`memberships`, NUNCA por sticks.
//
// ⚠️ `confidentiality_level` (item) e `visibility` (nota) são RÓTULOS DE APP, não
// segurança: o acesso real é só a permissão `care.view`/`care.manage` (RLS não
// separa por item/nota). Ver README.

export type CarePriority = "celebration" | "notice" | "attention" | "urgent";
export type CareStatus = "new" | "assigned" | "in_progress" | "waiting" | "resolved" | "closed";

export interface CareContact {
  id: string;
  contacted_on: string; // date
  method: string;
  note: string;
  byName: string; // nome do staff (auth.users → profiles), "—" se desconhecido
}

export interface CareNote {
  id: string;
  content: string;
  visibility: string; // rótulo
  authorName: string;
  created_at: string;
}

export interface CareItem {
  id: string;
  stick_id: string | null;
  stickName: string; // pessoa cuidada (sticks); "" se sem stick
  signal_id: string | null;
  category: string;
  title: string;
  description: string;
  assigned_to: string | null; // auth.users id
  assignedName: string; // resolvido por profiles/memberships
  priority: CarePriority;
  status: CareStatus;
  due_date: string; // date | ""
  confidentiality_level: string;
  next_action: string;
  created_at: string;
  resolved_at: string | null;
  contacts: CareContact[];
  notes: CareNote[];
}

// Opção de responsável (staff = auth.users, via memberships/profiles).
export interface MemberOption {
  id: string; // auth.users id
  name: string;
}

// Opção de pessoa cuidada (Stick não arquivada do campus ativo).
export interface StickOption {
  id: string;
  name: string;
}
