import { NextResponse } from "next/server";

/**
 * Endpoint de sync com fallback garantido para dados estáticos
 * Usado como workaround enquanto Supabase quota está exceeded
 *
 * GET /api/sync-fallback
 */
export async function GET() {
  try {
    // Sempre retorna dados estáticos como fallback
    const { categories, menuItems } = await import("@/data/menu");

    console.log("[SYNC-FALLBACK] Retornando dados estáticos", {
      categoriesCount: categories.length,
      productsCount: menuItems.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      categories,
      products: menuItems,
      fallback: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC-FALLBACK] Erro:", msg);
    return NextResponse.json(
      { error: "Falha ao carregar dados estáticos", details: msg },
      { status: 500 }
    );
  }
}
