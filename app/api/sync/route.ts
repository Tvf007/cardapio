import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
    const { products, categories } = await request.json();

    // Upsert categorias (atualiza se existe, insere se novo)
    if (categories && categories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .upsert(categories, { onConflict: "id" });

      if (catError) {
        console.error("Erro ao salvar categorias:", catError);
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
        console.error("Erro ao salvar produtos:", prodError);
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
