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

export async function GET() {
  try {
    // Buscar categorias e produtos em paralelo
    const [categoriesResult, productsResult] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("menu_items").select("*"),
    ]);

    if (categoriesResult.error || productsResult.error) {
      return NextResponse.json(
        { error: "Erro ao buscar dados do Supabase" },
        { status: 500 }
      );
    }

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

    // Cache por 5 segundos no browser, permitir stale-while-revalidate por 30s
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=5, stale-while-revalidate=30"
    );

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[SYNC GET] Erro:", errorMessage);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
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
    const body = await request.json();
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

    // Validar tamanho das imagens para evitar falhas de sincronização
    // Limite aumentado de 500KB para 700KB para mais tolerância com imagens variadas
    const maxImageSizeKB = 700;
    for (const product of products) {
      const prod = product as Record<string, unknown>;
      if (prod.image && typeof prod.image === "string") {
        const imageSizeKB = (prod.image.length * 3) / 4 / 1024;
        if (imageSizeKB > maxImageSizeKB) {
          return NextResponse.json(
            {
              error: `Imagem do produto "${prod.name || prod.id}" muito grande (${imageSizeKB.toFixed(0)}KB). Máximo: ${maxImageSizeKB}KB. Tente comprimir a imagem.`
            },
            { status: 400 }
          );
        }
      }
    }

    // Filtrar categorias inválidas
    const validCategories = filterValidCategories(categories);

    // Validar dados antes de salvar
    try {
      if (validCategories.length > 0) {
        validateArray(CategorySchema, validCategories, "categories");

        const duplicateNames = checkDuplicateCategoryNames(validCategories);
        if (duplicateNames.length > 0) {
          return NextResponse.json(
            { error: "Nomes de categorias duplicados" },
            { status: 400 }
          );
        }
      }

      if (products.length > 0) {
        validateArray(MenuItemSchema, products, "products");
      }
    } catch (validationError) {
      const msg =
        validationError instanceof Error
          ? validationError.message
          : "Erro de validação";
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
      validCategories.map((c) => String(c.id))
    );
    const newProductIds = new Set(products.map((p: unknown) => String((p as Record<string, unknown>).id)));

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
    if (validCategories.length > 0) {
      const { error } = await supabase
        .from("categories")
        .upsert(validCategories, { onConflict: "id" });
      if (error) throw error;
    }

    if (products.length > 0) {
      const { error } = await supabase
        .from("menu_items")
        .upsert(products, { onConflict: "id" });
      if (error) {
        console.error("[SYNC] Erro ao fazer upsert de products:", error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
      categoriesCount: validCategories.length,
      productsCount: products.length,
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
