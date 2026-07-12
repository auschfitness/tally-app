// Sessão viva: cliente Supabase, id da organização e usuário logado.
// São "bindings vivos" — quando o setter reatribui, todos os módulos que
// importam a variável enxergam o novo valor.

export let SB = null;
export let ORG_ID = null;
export let USER = null;

export function setSB(v) { SB = v; }
export function setOrg(v) { ORG_ID = v; }
export function setUser(v) { USER = v; }
