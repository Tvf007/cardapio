import { createClient } from "@supabase/supabase-js";

// Logging detalhado para debug em Netlify
const DEBUG = true;

function logDebug(message: string, data?: unknown) {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    if (typeof window === "undefined") {
      // Server-side (Node.js/Netlify)
      console.log(`[SUPABASE-SERVER ${timestamp}] ${message}`, data || "");
    } else {
      // Client-side (Browser)
      console.log(`[SUPABASE-CLIENT ${timestamp}] ${message}`, data || "");
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

logDebug("Inicializando Supabase client", {
  urlPresente: !!supabaseUrl,
  urlTamanho: supabaseUrl?.length || 0,
  keyPresente: !!supabaseAnonKey,
  keyTamanho: supabaseAnonKey?.length || 0,
  nodeEnv: process.env.NODE_ENV,
  runtimeEnv: typeof window === "undefined" ? "server" : "browser",
});

if (!supabaseUrl) {
  const error = new Error(
    "ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_URL não configurada. " +
    "Verificar variáveis de ambiente no Netlify dashboard: " +
    "https://app.netlify.com/projects/cardapio-freitas/settings/build-deploy"
  );
  console.error(error.message);
  throw error;
}

if (!supabaseAnonKey) {
  const error = new Error(
    "ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada. " +
    "Verificar variáveis de ambiente no Netlify dashboard: " +
    "https://app.netlify.com/projects/cardapio-freitas/settings/build-deploy"
  );
  console.error(error.message);
  throw error;
}

logDebug("Criando cliente Supabase com URL válida");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

logDebug("Cliente Supabase inicializado com sucesso");
