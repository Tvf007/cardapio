import { NextRequest, NextResponse } from "next/server";
import { cleanupInvalidCategories } from "@/lib/turso";

export async function POST(request: NextRequest) {
  try {
    console.log("[CLEANUP] Iniciando limpeza de dados inválidos...");

    const result = await cleanupInvalidCategories();

    console.log(`[CLEANUP] Verificadas ${result.totalChecked} categorias, deletadas ${result.deleted} inválidas`);

    return NextResponse.json({
      success: true,
      message: "Limpeza concluída com sucesso",
      deletedCategories: result.deleted,
      totalCategoriesChecked: result.totalChecked,
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
