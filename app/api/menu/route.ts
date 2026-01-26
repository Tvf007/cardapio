import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { join } from "path";

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

export async function POST(request: NextRequest) {
  try {
    const { products, categories } = await request.json();

    // Gerar o conteúdo do arquivo TypeScript
    const fileContent = `import { MenuItem, Category } from "@/types";

export const categories: Category[] = ${JSON.stringify(categories, null, 2)};

export const menuItems: MenuItem[] = ${JSON.stringify(products, null, 2)};
`;

    // Salvar o arquivo
    writeFileSync(
      join(process.cwd(), "data", "menu.ts"),
      fileContent
    );

    return NextResponse.json({
      success: true,
      message: "Cardápio salvo com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao salvar menu:", error);
    return NextResponse.json(
      { error: "Erro ao salvar menu" },
      { status: 500 }
    );
  }
}
