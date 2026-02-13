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

// Note: Este script é apenas para referência. A coluna já foi criada manualmente.
// Se precisar criar novamente, execute no SQL Editor do Supabase conforme os comentários acima.

console.log("Script de migração já executado. A coluna 'order' foi criada no Supabase.");
