import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateArray, MenuItemSchema, CategorySchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/authGuard";

// Funções auxiliares para normalização
function normalizePrice(price: unknown): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") return parseFloat(price) || 0;
  return 0;
}

function normalizeImage(image: unknown): string {
  if (typeof image === "string" && image.length > 0) {
    return image;
  }
  return "";
}

function normalizeAvailable(available: unknown): boolean {
  return available === true || available === 1;
}

/**
 * Calcula o tamanho EXATO de uma string base64
 *
 * Formula:
 * - Base64 usa 4 caracteres para representar 3 bytes
 * - Padding (=) no final indica bytes faltantes
 * - Cálculo: (comprimento / 4) * 3 - padding
 *
 * @param base64String - String base64 da imagem (com ou sem data URI prefix)
 * @returns Tamanho em bytes
 */
function getExactBase64SizeBytes(base64String: string): number {
  // Remover data URI prefix se existir (ex: "data:image/jpeg;base64,")
  let cleanBase64 = base64String;
  if (base64String.includes(",")) {
    cleanBase64 = base64String.split(",")[1];
  }

  // Contar padding
  let paddingCount = 0;
  if (cleanBase64.endsWith("==")) {
    paddingCount = 2;
  } else if (cleanBase64.endsWith("=")) {
    paddingCount = 1;
  }

  // Cálculo preciso: (comprimento / 4) * 3 - padding
  const sizeBytes = Math.floor((cleanBase64.length / 4) * 3) - paddingCount;
  return Math.max(sizeBytes, 0); // Nunca retornar negativo
}

/**
 * Valida se tamanho da imagem está dentro do limite
 * Com tolerância de +5% para variações de encoding
 *
 * @param imageBase64 - String base64 da imagem
 * @param maxSizeKB - Tamanho máximo em KB (default: 700)
 * @returns Objeto com validação, tamanho em KB e mensagem se inválida
 */
function isImageSizeValid(
  imageBase64: string,
  maxSizeKB: number = 700
): {
  valid: boolean;
  sizeKB: number;
  sizeBytes: number;
  message?: string;
} {
  const sizeBytes = getExactBase64SizeBytes(imageBase64);
  const sizeKB = sizeBytes / 1024;

  // Permitir +5% de margem para variações de codificação
  // Exemplo: 700KB + 5% = 735KB
  const tolerancePercent = 0.05;
  const tolerance = maxSizeKB * tolerancePercent;
  const actualLimit = maxSizeKB + tolerance;

  if (sizeKB > actualLimit) {
    const message = `Imagem: ${sizeKB.toFixed(0)}KB, máximo: ${maxSizeKB}KB. Tente reduzir qualidade ou dimensão.`;
    return {
      valid: false,
      sizeKB,
      sizeBytes,
      message,
    };
  }

  return {
    valid: true,
    sizeKB,
    sizeBytes,
  };
}

function filterValidCategories(
  categories: unknown[]
): Record<string, unknown>[] {
  return categories.filter(
    (cat: unknown) =>
      cat &&
      typeof cat === "object" &&
      "id" in cat &&
      (cat as Record<string, unknown>).id &&
      typeof (cat as Record<string, unknown>).id === "string"
  ) as Record<string, unknown>[];
}

/**
 * Função auxiliar para fazer upsert em batches com timeout
 * Evita travamento ao fazer upsert de muitos produtos com imagens grandes
 *
 * @param supabase - Cliente Supabase
 * @param table - Nome da tabela (categories ou menu_items)
 * @param items - Array de items a fazer upsert
 * @param batchSize - Tamanho de cada batch (default: 100)
 * @param timeoutMs - Timeout para cada batch em ms (default: 15000)
 */
async function upsertWithBatches(
  supabase: any,
  table: string,
  items: any[],
  batchSize: number = 100,
  timeoutMs: number = 15000
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  // Dividir em batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(
    `[SYNC] Fazendo upsert de ${items.length} items em ${batches.length} batches de ${batchSize}`
  );

  let successCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      // Criar promise de timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Timeout de ${timeoutMs}ms no upsert de batch ${batchIndex + 1}/${batches.length} da tabela '${table}'`
              )
            ),
          timeoutMs
        )
      );

      // Executar upsert com race condition para timeout
      const result = await Promise.race([
        supabase
          .from(table)
          .upsert(batch, { onConflict: "id" }),
        timeoutPromise,
      ]);

      // Verificar se houve erro
      if (result && result.error) {
        throw result.error;
      }

      successCount += batch.length;
      console.log(
        `[SYNC] ✅ Batch ${batchIndex + 1}/${batches.length} concluido (${batch.length} items, total ${successCount}/${items.length})`
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[SYNC] ❌ Erro no batch ${batchIndex + 1}/${batches.length}:`,
        errorMsg
      );
      throw error;
    }
  }

  console.log(
    `[SYNC] ✅ Upsert concluido: ${successCount} items salvos em ${batches.length} batches`
  );
}

export async function GET() {
  try {
    // Buscar categorias e produtos em paralelo
    console.log("[SYNC GET] Iniciando busca de dados do Supabase");

    // FALLBACK: Se Supabase não estiver disponível, retornar dados estáticos
    // Este é um band-aid temporário enquanto variáveis de ambiente são configuradas
    let categoriesResult: any;
    let productsResult: any;

    try {
      [categoriesResult, productsResult] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("menu_items").select("*"),
      ]);
    } catch (supabaseError) {
      console.warn("[SYNC GET] Fallback ativado - Supabase indisponível, usando dados estáticos", {
        error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
      });

      // Importar dados estáticos como fallback
      const { categories: staticCategories, menuItems: staticProducts } = await import("@/data/menu");
      categoriesResult = { data: staticCategories };
      productsResult = { data: staticProducts };
    }

    // Verificar erros com mensagens detalhadas
    if (categoriesResult.error) {
      const errorMsg = categoriesResult.error.message || String(categoriesResult.error);
      console.warn("[SYNC GET] Erro ao buscar categorias, verificando fallback:", {
        message: errorMsg,
        code: categoriesResult.error.code,
      });

      // Se for erro de quota ou API indisponível, usar fallback
      if (
        errorMsg.includes("exceed_egress_quota") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("restricted")
      ) {
        console.log("[SYNC GET] 🔄 Fallback ativado - Supabase quota exceeded, usando dados estáticos");
        const { categories: staticCategories, menuItems: staticProducts } = await import(
          "@/data/menu"
        );
        return NextResponse.json({
          categories: staticCategories,
          products: staticProducts,
        });
      }

      return NextResponse.json(
        {
          error: "Erro ao buscar categorias do Supabase",
          details: errorMsg,
          code: categoriesResult.error.code,
        },
        { status: 500 }
      );
    }

    if (productsResult.error) {
      const errorMsg = productsResult.error.message || String(productsResult.error);
      console.warn("[SYNC GET] Erro ao buscar produtos, verificando fallback:", {
        message: errorMsg,
        code: productsResult.error.code,
      });

      // Se for erro de quota ou API indisponível, usar fallback
      if (
        errorMsg.includes("exceed_egress_quota") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("restricted")
      ) {
        console.log("[SYNC GET] 🔄 Fallback ativado - Supabase quota exceeded, usando dados estáticos");
        const { categories: staticCategories, menuItems: staticProducts } = await import(
          "@/data/menu"
        );
        return NextResponse.json({
          categories: staticCategories,
          products: staticProducts,
        });
      }

      return NextResponse.json(
        {
          error: "Erro ao buscar produtos do Supabase",
          details: errorMsg,
          code: productsResult.error.code,
        },
        { status: 500 }
      );
    }

    console.log("[SYNC GET] ✅ Dados buscados com sucesso", {
      categoriesCount: (categoriesResult.data || []).length,
      productsCount: (productsResult.data || []).length,
    });

    const categories = categoriesResult.data || [];
    const products = productsResult.data || [];

    // Filtrar categorias invalidas e normalizar produtos
    const validCategories = filterValidCategories(categories);
    // IMPORTANTE: NÃO filtrar __site_logo__ para sincronizar logo entre dispositivos
    // A logo será extraída pelo frontend (useSyncedData.ts)
    const normalizedProducts = products.map((p: Record<string, unknown>) => ({
      ...p,
      price: normalizePrice(p.price),
      available: normalizeAvailable(p.available),
      image: normalizeImage(p.image),
    }));

    // PERFORMANCE FIX: Adicionar cache headers para reduzir carga
    const response = NextResponse.json({
      categories: validCategories,
      products: normalizedProducts,
    });

    // FIX (2026-02-14): Remover cache para evitar race condition com reordenação
    // - Anterior: s-maxage=5 era servir cache por 5s
    // - Problema: refresh() buscava dados de cache durante janela crítica
    // - Resultado: order field retornava valor antigo, UI revertia após 6-8s
    // - Solução: Sempre buscar do servidor, never cache stale data
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate"
    );

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "N/A";

    console.error("[SYNC GET] ❌ Erro ao buscar dados:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      type: typeof error,
    });

    // Se for erro de variáveis de ambiente
    if (
      errorMessage.includes("NEXT_PUBLIC_SUPABASE_URL") ||
      errorMessage.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      errorMessage.includes("nao configurada")
    ) {
      return NextResponse.json(
        {
          error: "Configuração do Supabase incompleta",
          details: "Variáveis de ambiente não configuradas no Netlify",
          helpText:
            "Acesse https://app.netlify.com/projects/cardapio-freitas/settings/build-deploy e configure as variáveis de ambiente",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Erro ao sincronizar dados",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Verificar nomes duplicados de categorias
function checkDuplicateCategoryNames(
  categories: Record<string, unknown>[]
): string[] {
  const categoryNames = categories.map((c) =>
    String(c.name || "").toLowerCase()
  );
  return categoryNames.filter(
    (name, index) => categoryNames.indexOf(name) !== index
  );
}

export async function POST(request: NextRequest) {
  // SECURITY: Verificar autenticação admin antes de permitir modificações
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // FIX CRÍTICO: Capturar erro de parsing JSON (pode falhar se body > 1MB)
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      const parseMsg = parseError instanceof Error ? parseError.message : "Erro ao fazer parse do JSON";
      console.error("[SYNC] ❌ Erro ao fazer parse do request body:", {
        message: parseMsg,
        stack: parseError instanceof Error ? parseError.stack : "N/A",
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        {
          error: "Erro ao processar dados enviados",
          details: "O corpo da requisição é inválido ou muito grande (limite: 1MB). Reduza o tamanho das imagens e tente novamente.",
          hint: "Divida a sincronização em partes menores ou comprima as imagens."
        },
        { status: 400 }
      );
    }

    let { products = [], categories = [] } = body as {
      products?: unknown[];
      categories?: unknown[];
    };

    // Validar que são arrays
    if (!Array.isArray(categories) || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Categories e products devem ser arrays" },
        { status: 400 }
      );
    }

    // Validar tamanho das imagens
    // URLs (Supabase Storage) são aceitas sem validação de tamanho
    // Base64 (legado) ainda validado com limite de 1500KB
    const maxImageSizeKB = 1500;
    const imageValidationErrors: string[] = [];

    for (const product of products) {
      const prod = product as Record<string, unknown>;
      if (prod.image && typeof prod.image === "string") {
        const imageStr = prod.image as string;

        // URLs externas (Supabase Storage) — aceitar sem validação
        if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
          continue;
        }

        // Base64 (legado) — validar tamanho
        if (imageStr.startsWith("data:")) {
          const validation = isImageSizeValid(imageStr, maxImageSizeKB);
          if (!validation.valid) {
            imageValidationErrors.push(
              `"${String(prod.name || prod.id)}": ${validation.message}`
            );
          }
        }
      }
    }

    // Se alguma imagem for inválida, retornar erro detalhado
    if (imageValidationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Uma ou mais imagens excedem o tamanho máximo permitido",
          details: imageValidationErrors,
          maxSizeKB: maxImageSizeKB,
          helpText: "Tente comprimir as imagens ou reduzir suas dimensões",
        },
        { status: 400 }
      );
    }

    // Filtrar categorias inválidas
    const validCategories = filterValidCategories(categories);

    // Validar dados antes de salvar
    // CRÍTICO FIX: Usar o retorno de validateArray, não descartar!
    let validatedCategories = validCategories;
    let validatedProducts = products;

    try {
      // LOGGING DETALHADO: Antes de validação Zod
      const validationStartTime = Date.now();
      console.log(`[SYNC] Iniciando validação Zod`, {
        categoriesCount: validCategories.length,
        productsCount: products.length,
        timestamp: new Date().toISOString()
      });

      if (validCategories.length > 0) {
        console.log(`[SYNC] Validando ${validCategories.length} categorias...`);
        const catValidationStart = Date.now();

        // IMPORTANT: Capture the validated result - Zod applies defaults and normalizes data
        validatedCategories = validateArray(CategorySchema, validCategories, "categories");

        const catValidationDuration = Date.now() - catValidationStart;
        console.log(`[SYNC] ✅ Validação de categorias concluida em ${catValidationDuration}ms`);

        const duplicateNames = checkDuplicateCategoryNames(validatedCategories);
        if (duplicateNames.length > 0) {
          console.error(`[SYNC] ❌ Categorias duplicadas encontradas:`, duplicateNames);
          return NextResponse.json(
            { error: "Nomes de categorias duplicados" },
            { status: 400 }
          );
        }
      }

      if (products.length > 0) {
        console.log(`[SYNC] Validando ${products.length} produtos...`);
        const prodValidationStart = Date.now();

        // IMPORTANT: Capture the validated result
        validatedProducts = validateArray(MenuItemSchema, products, "products");

        const prodValidationDuration = Date.now() - prodValidationStart;
        console.log(`[SYNC] ✅ Validação de produtos concluida em ${prodValidationDuration}ms`);
      }

      const totalValidationDuration = Date.now() - validationStartTime;
      console.log(`[SYNC] ✅ Validação Zod concluida em ${totalValidationDuration}ms`, {
        categoriesValidated: validatedCategories.length,
        productsValidated: validatedProducts.length
      });
    } catch (validationError) {
      const msg =
        validationError instanceof Error
          ? validationError.message
          : "Erro de validação";
      console.error(`[SYNC] ❌ Erro de validação Zod:`, {
        message: msg,
        stack: validationError instanceof Error ? validationError.stack : "N/A",
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Executar operações de banco
    const [existingCatResult, existingProdResult] = await Promise.all([
      supabase.from("categories").select("id"),
      supabase.from("menu_items").select("id"),
    ]);

    const existingCategoryIds = new Set(
      (existingCatResult.data || []).map((c: Record<string, unknown>) =>
        String(c.id)
      )
    );
    const existingProductIds = new Set(
      (existingProdResult.data || []).map((p: Record<string, unknown>) =>
        String(p.id)
      )
    );

    const newCategoryIds = new Set(
      validatedCategories.map((c) => String((c as Record<string, unknown>).id))
    );
    const newProductIds = new Set(validatedProducts.map((p: unknown) => String((p as Record<string, unknown>).id)));

    // CRITICAL FIX: Proteger categoria __hidden__ e logo __site_logo__ de deleção
    // O frontend filtra esses itens de sistema, então eles nunca vêm no array de sync
    // Sem esta proteção, eles seriam deletados a cada sync do admin
    const categoriesToDelete = [
      ...existingCategoryIds,
    ].filter((id) => !newCategoryIds.has(id) && id !== "__hidden__");
    const productsToDelete = [...existingProductIds].filter(
      (id) => !newProductIds.has(id) && id !== "__site_logo__" && !id.startsWith("__site_config_")
    );

    // Fase de deletação
    if (categoriesToDelete.length > 0) {
      const { error } = await supabase
        .from("categories")
        .delete()
        .in("id", categoriesToDelete);
      if (error) throw error;
    }

    if (productsToDelete.length > 0) {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .in("id", productsToDelete);
      if (error) throw error;
    }

    // Fase de upsert
    // CRITICAL FIX: Deduplicar por ID antes do upsert
    // PostgreSQL rejeita ON CONFLICT DO UPDATE se o mesmo ID aparece 2x no mesmo comando
    // Causa: estado do React pode conter duplicados em edge cases (cache + server merge)
    // Solução: Map com ID como chave - último valor ganha (mais recente)
    const deduplicatedCategories = validatedCategories.length > 0
      ? [...new Map((validatedCategories as Record<string, unknown>[]).map(c => [c.id, c])).values()]
      : [];
    const deduplicatedProducts = validatedProducts.length > 0
      ? [...new Map((validatedProducts as Record<string, unknown>[]).map(p => [(p as Record<string, unknown>).id, p])).values()]
      : [];

    if (deduplicatedCategories.length !== validatedCategories.length) {
      console.warn(`[SYNC] ⚠️ Categorias duplicadas removidas: ${validatedCategories.length} → ${deduplicatedCategories.length}`);
    }
    if (deduplicatedProducts.length !== (validatedProducts as unknown[]).length) {
      console.warn(`[SYNC] ⚠️ Produtos duplicados removidos: ${(validatedProducts as unknown[]).length} → ${deduplicatedProducts.length}`);
    }

    if (deduplicatedCategories.length > 0) {
      const { error } = await supabase
        .from("categories")
        .upsert(deduplicatedCategories, { onConflict: "id" });
      if (error) throw error;
    }

    if (deduplicatedProducts.length > 0) {
      try {
        // Usar batch processing com timeout para evitar travamento
        // Batch size: 100 produtos por vez
        // Timeout: 15 segundos por batch
        await upsertWithBatches(
          supabase,
          "menu_items",
          deduplicatedProducts,
          100,
          15000
        );
      } catch (error) {
        console.error(
          "[SYNC] Erro ao fazer upsert de produtos (batch processing):",
          error
        );
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
      categoriesCount: deduplicatedCategories.length,
      productsCount: deduplicatedProducts.length,
      deletedCategories: categoriesToDelete.length,
      deletedProducts: productsToDelete.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[SYNC POST] Erro completo:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : "N/A",
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: "Erro ao sincronizar dados", details: errorMessage },
      { status: 500 }
    );
  }
}
