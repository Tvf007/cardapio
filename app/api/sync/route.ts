import { NextRequest, NextResponse } from "next/server";
import { getCategoriesAndMenuItems, syncData as tursoSync } from "@/lib/turso";
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

// Batch processing movido para lib/turso.ts - ver função syncData()

export async function GET() {
  try {
    // Buscar categorias e produtos do Turso
    console.log("[SYNC GET] Iniciando busca de dados do Turso");

    const { categories: rawCategories, menuItems: rawProducts } =
      await getCategoriesAndMenuItems();

    console.log("[SYNC GET] ✅ Dados buscados com sucesso", {
      categoriesCount: rawCategories.length,
      productsCount: rawProducts.length,
    });

    const categories = rawCategories || [];
    const products = rawProducts || [];

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

    // CACHE STRATEGY (2026-02-20):
    // Use stale-while-revalidate to balance freshness + performance
    // - Serve stale cache for 60s (fast response)
    // - Revalidate in background (fresh data)
    // - Falls back to server on cache miss
    // This avoids race conditions while providing good UX
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300, stale-if-error=3600"
    );
    // Add version tag to force invalidation if needed
    response.headers.set("X-Cache-Version", "v1");

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
      errorMessage.includes("TURSO_CONNECTION_URL") ||
      errorMessage.includes("TURSO_AUTH_TOKEN") ||
      errorMessage.includes("nao configurada")
    ) {
      return NextResponse.json(
        {
          error: "Configuração do Turso incompleta",
          details: "Variáveis de ambiente TURSO_CONNECTION_URL e TURSO_AUTH_TOKEN não configuradas",
          helpText:
            "Acesse o Netlify dashboard e configure TURSO_CONNECTION_URL e TURSO_AUTH_TOKEN",
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

    // CRITICAL FIX: Deduplicar por ID antes do upsert
    // SQLite ON CONFLICT rejeita duplicatas no mesmo comando
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

    // Usar Turso para sincronizar dados (handles deletions + upserts com transaction)
    console.log("[SYNC] Iniciando sincronização com Turso");
    const syncResult = await tursoSync(deduplicatedCategories, deduplicatedProducts);
    console.log("[SYNC] ✅ Sincronização Turso concluída:", syncResult);

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
      categoriesCount: deduplicatedCategories.length,
      productsCount: deduplicatedProducts.length,
      tursoSync: syncResult,
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
