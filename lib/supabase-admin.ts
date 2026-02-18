import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role key
 * Usado APENAS no servidor para operações que requerem permissões elevadas:
 * - Criar/gerenciar buckets de storage
 * - Upload de arquivos para storage
 * - Operações administrativas
 *
 * NUNCA expor ao frontend (sem prefixo NEXT_PUBLIC_)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fallback para anon key se service role não está configurada
const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Variáveis de ambiente Supabase não configuradas. " +
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const BUCKET_NAME = "cardapio-images";
export const hasServiceRole = !!serviceRoleKey;

/**
 * Garante que o bucket de imagens existe
 * Cria se necessário (requer service_role)
 */
export async function ensureBucket(): Promise<boolean> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.id === BUCKET_NAME);

    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 1048576, // 1MB
        allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
      });

      if (error) {
        console.error("[Storage] Erro ao criar bucket:", error.message);
        return false;
      }
      console.log("[Storage] Bucket criado:", BUCKET_NAME);
    }

    return true;
  } catch (error) {
    console.error("[Storage] Erro ao verificar bucket:", error);
    return false;
  }
}
