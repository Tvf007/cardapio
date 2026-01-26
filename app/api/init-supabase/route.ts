import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { categories as defaultCategories, menuItems as defaultMenuItems } from "@/data/menu";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    console.log("Iniciando sincronização...");

    // Verificar se já existem dados
    const { data: existingCats, error: checkError } = await supabase
      .from("categories")
      .select("id")
      .limit(1);

    if (checkError) {
      console.error("Erro ao verificar categorias:", checkError);
      return NextResponse.json(
        { error: "Erro ao verificar dados", details: checkError },
        { status: 500 }
      );
    }

    if (existingCats && existingCats.length > 0) {
      return NextResponse.json(
        {
          message: "Dados já existem no banco",
          categoriesCount: existingCats.length
        },
        { status: 200 }
      );
    }

    console.log("Inserindo categorias:", defaultCategories.length);

    // Inserir categorias
    if (defaultCategories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .insert(defaultCategories);

      if (catError) {
        console.error("Erro ao inserir categorias:", catError);
        return NextResponse.json(
          { error: "Erro ao inserir categorias", details: catError.message },
          { status: 500 }
        );
      }
    }

    console.log("Inserindo produtos:", defaultMenuItems.length);

    // Inserir produtos
    if (defaultMenuItems.length > 0) {
      const { error: prodError } = await supabase
        .from("menu_items")
        .insert(defaultMenuItems);

      if (prodError) {
        console.error("Erro ao inserir produtos:", prodError);
        return NextResponse.json(
          { error: "Erro ao inserir produtos", details: prodError.message },
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
  } catch (error: any) {
    console.error("Erro na inicialização:", error);
    return NextResponse.json(
      { error: "Erro ao inicializar Supabase", details: error.message },
      { status: 500 }
    );
  }
}
