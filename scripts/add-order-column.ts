#!/usr/bin/env node

/**
 * Script para adicionar a coluna 'order' à tabela categories no Supabase
 *
 * Alternativa: Executar manualmente no SQL Editor do Supabase:
 *
 * ALTER TABLE public.categories ADD COLUMN "order" INTEGER DEFAULT 0;
 *
 * UPDATE public.categories SET "order" = (
 *   SELECT COUNT(*) - 1
 *   FROM public.categories c2
 *   WHERE c2.id <= categories.id
 *   ORDER BY c2.id
 * )
 * WHERE TRUE;
 */

import fetch from "node-fetch";

const SUPABASE_URL = "https://xwyzkadsdifoztekwqfd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function addOrderColumn() {
  try {
    console.log("Verificando se coluna 'order' existe...");

    // Verificar a estrutura atual da tabela
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.columns?table_name=eq.categories&column_name=eq.order`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY || "",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const columns = await response.json();

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✓ Coluna 'order' já existe!");
      process.exit(0);
    }

    console.log("Coluna 'order' não encontrada. Você precisa criar manualmente.");
    console.log("\nExecute no SQL Editor do Supabase:");
    console.log("ALTER TABLE public.categories ADD COLUMN \"order\" INTEGER DEFAULT 0;");
    console.log(
      "\nDepois atualize os valores com sequência (0, 1, 2, ...):"
    );
    console.log(`UPDATE public.categories SET "order" = (
  SELECT COUNT(*) - 1
  FROM public.categories c2
  WHERE c2.created_at IS NULL OR c2.id <= categories.id
)`);

    process.exit(0);
  } catch (error) {
    console.error("Erro:", error);
    process.exit(1);
  }
}

addOrderColumn();
