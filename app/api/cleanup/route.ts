import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("[CLEANUP] Iniciando limpeza de dados inválidos...");

    // Buscar todas as categorias
    const { data: allCategories, error: catError } = await supabase
      .from("categories")
      .select("id, name");

    if (catError) {
      console.error("[CLEANUP] Erro ao buscar categorias:", catError);
      return NextResponse.json(
        { error: "Erro ao buscar categorias" },
        { status: 500 }
      );
    }

    // Identificar IDs inválidos (nulos, undefined ou strings vazias)
    const invalidIds = (allCategories || [])
      .filter((cat: any) => !cat.id || cat.id === null || cat.id === undefined || cat.id === "")
      .map((cat: any) => cat.id);

    console.log(`[CLEANUP] Encontradas ${allCategories?.length || 0} categorias no banco`);
    console.log(`[CLEANUP] Categorias com ID inválido: ${invalidIds.length}`, invalidIds);

    if (invalidIds.length > 0) {
      // Deletar categorias com IDs inválidos
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .is("id", null);

      if (deleteError) {
        console.error("[CLEANUP] Erro ao deletar categorias inválidas:", deleteError);
        const msg = deleteError && typeof deleteError === "object" && "message" in deleteError
          ? String((deleteError as { message: unknown }).message)
          : String(deleteError);
        return NextResponse.json(
          { error: "Erro ao deletar categorias inválidas", details: msg },
          { status: 500 }
        );
      }

      console.log(`[CLEANUP] Deletadas ${invalidIds.length} categorias inválidas`);
    }

    return NextResponse.json({
      success: true,
      message: "Limpeza concluída com sucesso",
      deletedCategories: invalidIds.length,
      totalCategoriesChecked: allCategories?.length || 0,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[CLEANUP] Erro na limpeza:", error);
    return NextResponse.json(
      { error: "Erro ao fazer limpeza", details: errorMessage },
      { status: 500 }
    );
  }
}
