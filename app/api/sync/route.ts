import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateArray, MenuItemSchema, CategorySchema } from "@/lib/validation";

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
    // Excluir itens do sistema (logo etc) que comecam com __
    const realProducts = products.filter(
      (p: Record<string, unknown>) => !String(p.id || "").startsWith("__")
    );
    const normalizedProducts = realProducts.map((p: Record<string, unknown>) => ({
      ...p,
      price: normalizePrice(p.price),
      available: normalizeAvailable(p.available),
      image: normalizeImage(p.image),
    }));

    return NextResponse.json({
      categories: validCategories,
      products: normalizedProducts,
    });
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

    const categoriesToDelete = [
      ...existingCategoryIds,
    ].filter((id) => !newCategoryIds.has(id));
    const productsToDelete = [...existingProductIds].filter(
      (id) => !newProductIds.has(id)
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
      if (error) throw error;
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
    console.error("[SYNC POST] Erro:", errorMessage);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados", details: errorMessage },
      { status: 500 }
    );
  }
}
