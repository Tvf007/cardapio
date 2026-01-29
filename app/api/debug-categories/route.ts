import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("[DEBUG] Buscando todas as categorias...");

    const { data: categories, error } = await supabase
      .from("categories")
      .select("*");

    if (error) {
      console.error("[DEBUG] Erro:", error);
      const msg = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log("[DEBUG] Categorias encontradas:", JSON.stringify(categories, null, 2));

    // Analisar cada categoria
    const analysis = (categories || []).map((cat: any, index: number) => ({
      index,
      id: cat.id,
      id_type: typeof cat.id,
      id_is_null: cat.id === null,
      id_is_undefined: cat.id === undefined,
      id_is_empty: cat.id === "",
      id_truthy: Boolean(cat.id),
      name: cat.name,
      keys: Object.keys(cat),
    }));

    return NextResponse.json({
      total: categories?.length || 0,
      raw_categories: categories,
      analysis,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
