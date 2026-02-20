import { NextResponse } from "next/server";
import { categories as defaultCategories, menuItems as defaultMenuItems } from "@/data/menu";
import { hasData, initializeData } from "@/lib/turso";

/**
 * GET /api/init-supabase (mantido nome por compatibilidade)
 * Inicializa o banco Turso com dados padrão se estiver vazio
 */
export async function GET() {
  try {
    console.log("[INIT] Verificando se banco já tem dados...");

    const dataExists = await hasData();

    if (dataExists) {
      return NextResponse.json(
        {
          message: "Dados já existem no banco",
        },
        { status: 200 }
      );
    }

    console.log("[INIT] Inserindo dados iniciais:", {
      categories: defaultCategories.length,
      menuItems: defaultMenuItems.length,
    });

    const result = await initializeData(defaultCategories, defaultMenuItems);

    return NextResponse.json({
      success: true,
      message: "Banco inicializado com sucesso!",
      categoriesCount: result.categoriesCount,
      productsCount: result.menuItemsCount,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[INIT] Erro na inicialização:", error);
    return NextResponse.json(
      { error: "Erro ao inicializar banco", details: errorMessage },
      { status: 500 }
    );
  }
}
