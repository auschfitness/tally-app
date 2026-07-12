// Configuração pública do Tally.
//
// A chave abaixo é a ANON KEY do Supabase. Ela é PÚBLICA por design:
// toda a segurança dos dados está nas políticas de RLS (Row Level Security)
// do banco, não em esconder esta chave. Por isso pode ficar no código e ir
// para o GitHub sem risco.
//
// NUNCA coloque aqui a service_role key — essa sim ignora o RLS e só pode
// existir em servidor/edge functions.
export const SUPABASE_URL = "https://zzgxeylyrtzsqcdguxql.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6Z3hleWx5cnR6c3FjZGd1eHFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTcyNzgsImV4cCI6MjA5OTM3MzI3OH0.Az_WOYNsX5L3qKyply5SotBVuBYten6vkN2Q4OUrFOU";
