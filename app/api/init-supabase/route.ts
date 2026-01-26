import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { categories as defaultCategories, menuItems as defaultMenuItems } from "@/data/menu";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST() {
  try {
    // Verificar se já existem dados
    const { data: existingCats } = await supabase
      .from("categories")
      .select("id")
      .limit(1);

    if (existingCats && existingCats.length > 0) {
      return NextResponse.json(
        { message: "Dados já existem no banco" },
        { status: 200 }
      );
    }

    // Inserir categorias
    if (defaultCategories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .insert(defaultCategories);

      if (catError) {
        console.error("Erro ao inserir categorias:", catError);
        return NextResponse.json(
          { error: "Erro ao inserir categorias" },
          { status: 500 }
        );
      }
    }

    // Inserir produtos
    if (defaultMenuItems.length > 0) {
      const { error: prodError } = await supabase
        .from("menu_items")
        .insert(defaultMenuItems);

      if (prodError) {
        console.error("Erro ao inserir produtos:", prodError);
        return NextResponse.json(
          { error: "Erro ao inserir produtos" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Supabase inicializado com sucesso!",
      categoriesCount: defaultCategories.length,
      productsCount: defaultMenuItems.length,
    });
  } catch (error) {
    console.error("Erro na inicialização:", error);
    return NextResponse.json(
      { error: "Erro ao inicializar Supabase" },
      { status: 500 }
    );
  }
}
