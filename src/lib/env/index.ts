// Env centralizado e validado. As variáveis NEXT_PUBLIC_* são inlinadas no
// build (precisam aparecer como `process.env.NEXT_PUBLIC_*` literal no código).
// Só há chaves PÚBLICAS aqui — a service_role nunca entra no bundle do cliente.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja .env.example.`);
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;
