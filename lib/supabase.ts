import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase - usado APENAS para:
 * 1. Supabase Storage (upload de imagens) via supabase-admin.ts
 * 2. Compatibilidade com frontend hooks (useSyncedData.ts)
 *
 * O banco de dados principal agora é Turso SQLite Cloud (lib/turso.ts)
 * Supabase PostgreSQL foi substituído por Turso para evitar egress quota
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Criar client apenas se as variáveis existirem
// No servidor, pode não ter (ok, usamos Turso)
// No browser, precisa ter para compatibilidade temporária
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

// Export um proxy que não quebra se supabase não estiver configurado
export const supabase = supabaseClient || createDummyClient();

function createDummyClient() {
  // Dummy client que retorna erros amigáveis em vez de crashar
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "channel") {
        return (name: string) => ({
          on: () => ({ on: () => ({ subscribe: () => {} }) }),
          subscribe: () => {},
          unsubscribe: () => {},
        });
      }
      if (prop === "from") {
        return () => ({
          select: () => ({ data: null, error: { message: "Supabase não configurado - usando Turso" } }),
          insert: () => ({ data: null, error: { message: "Supabase não configurado - usando Turso" } }),
          update: () => ({ data: null, error: { message: "Supabase não configurado - usando Turso" } }),
          delete: () => ({ data: null, error: { message: "Supabase não configurado - usando Turso" } }),
          upsert: () => ({ data: null, error: { message: "Supabase não configurado - usando Turso" } }),
        });
      }
      return undefined;
    },
  };
  return new Proxy({}, handler) as ReturnType<typeof createClient>;
}
