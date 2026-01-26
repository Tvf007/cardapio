import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { categories, menuItems } = await import("@/data/menu");
    return NextResponse.json({
      categories,
      products: menuItems,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao carregar menu" }, { status: 500 });
  }
}
