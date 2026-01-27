import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateArray, MenuItemSchema, CategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    // Buscar categorias
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("*");

    // Buscar produtos
    const { data: products, error: prodError } = await supabase
      .from("menu_items")
      .select("*");

    if (catError || prodError) {
      console.error("Erro ao buscar dados:", catError || prodError);
      return NextResponse.json(
        { error: "Erro ao buscar dados do Supabase" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      categories: categories || [],
      products: products || [],
    });
  } catch (error) {
    console.error("Erro na API de sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products, categories } = body;

    // Validar dados antes de salvar
    try {
      if (!Array.isArray(categories) || !Array.isArray(products)) {
        return NextResponse.json(
          { error: "Categories e products devem ser arrays" },
          { status: 400 }
        );
      }

      // Validar categorias
      if (categories.length > 0) {
        validateArray(CategorySchema, categories, "categories");
      }

      // Validar produtos
      if (products.length > 0) {
        validateArray(MenuItemSchema, products, "products");
      }
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Erro de validação" },
        { status: 400 }
      );
    }

    // Upsert categorias (atualiza se existe, insere se novo)
    if (categories && categories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .upsert(categories, { onConflict: "id" });

      if (catError) {
        return NextResponse.json(
          { error: "Erro ao salvar categorias", details: catError.message },
          { status: 500 }
        );
      }
    }

    // Upsert produtos (atualiza se existe, insere se novo)
    if (products && products.length > 0) {
      const { error: prodError } = await supabase
        .from("menu_items")
        .upsert(products, { onConflict: "id" });

      if (prodError) {
        return NextResponse.json(
          { error: "Erro ao salvar produtos", details: prodError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
      categoriesCount: categories?.length || 0,
      productsCount: products?.length || 0,
    });
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados", details: error.message },
      { status: 500 }
    );
  }
}
