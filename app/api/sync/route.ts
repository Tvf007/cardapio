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

    // Limpar dados antigos
    await supabase.from("menu_items").delete().gte("id", "");
    await supabase.from("categories").delete().gte("id", "");

    // Inserir categorias
    if (categories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .insert(categories);

      if (catError) {
        console.error("Erro ao inserir categorias:", catError);
        return NextResponse.json(
          { error: "Erro ao salvar categorias" },
          { status: 500 }
        );
      }
    }

    // Inserir produtos
    if (products.length > 0) {
      const { error: prodError } = await supabase
        .from("menu_items")
        .insert(products);

      if (prodError) {
        console.error("Erro ao inserir produtos:", prodError);
        return NextResponse.json(
          { error: "Erro ao salvar produtos" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
    });
  } catch (error) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
      { status: 500 }
    );
  }
}
