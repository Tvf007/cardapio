import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateArray, MenuItemSchema, CategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    console.log("[SYNC GET] Iniciando busca de dados...");

    // Buscar categorias
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("*");

    // Buscar produtos
    const { data: products, error: prodError } = await supabase
      .from("menu_items")
      .select("*");

    if (catError || prodError) {
      console.error("[SYNC GET] Erro ao buscar dados:", catError || prodError);
      return NextResponse.json(
        { error: "Erro ao buscar dados do Supabase" },
        { status: 500 }
      );
    }

    console.log(`[SYNC GET] Encontrados ${categories?.length || 0} categorias e ${products?.length || 0} produtos`);

    // Normalizar precos, disponibilidade e imagens
    const normalizePrice = (price: any): number => {
      if (typeof price === 'number') return price;
      if (typeof price === 'string') return parseFloat(price) || 0;
      return 0;
    };

    const normalizeImage = (image: any): string => {
      if (typeof image === 'string' && image.length > 0) {
        // Se for URL, data URI, manter
        if (image.startsWith('http') || image.startsWith('data:')) {
          console.log(`[SYNC GET] Imagem valida encontrada (${image.substring(0, 50)}...)`);
          return image;
        }
        // Se for qualquer outra coisa nao vazia, manter tambem (pode ser path)
        console.log(`[SYNC GET] Imagem com formato desconhecido: ${image.substring(0, 50)}`);
        return image;
      }
      // Se for null, undefined, vazia ou outro tipo, retornar string vazia
      return '';
    };

    const normalizedProducts = (products || []).map((p: any) => {
      const normalizedImage = normalizeImage(p.image);
      if (p.image && !normalizedImage) {
        console.log(`[SYNC GET] Produto ${p.name}: imagem perdida na normalizacao. Original: ${typeof p.image}`);
      }
      return {
        ...p,
        price: normalizePrice(p.price),
        available: p.available === true || p.available === 1,
        image: normalizedImage,
      };
    });

    // Log de debug para produtos com imagem
    const productsWithImages = normalizedProducts.filter((p: any) => p.image && p.image.length > 0);
    console.log(`[SYNC GET] ${productsWithImages.length} produtos tem imagem definida`);

    return NextResponse.json({
      categories: categories || [],
      products: normalizedProducts,
    });
  } catch (error) {
    console.error("[SYNC GET] Erro na API de sincronizacao:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[SYNC POST] Iniciando sincronizacao...");
    const body = await request.json();
    const { products, categories } = body;

    // Log de debug para imagens
    const productsWithImages = (products || []).filter((p: any) => p.image && p.image.length > 0);
    console.log(`[SYNC POST] Recebidos ${products?.length || 0} produtos, ${productsWithImages.length} com imagem`);
    productsWithImages.forEach((p: any) => {
      console.log(`[SYNC POST] Produto "${p.name}" tem imagem: ${p.image?.substring(0, 60)}...`);
    });

    // Filtrar categorias inválidas (com ID nulo)
    const validCategories = categories.filter((cat: any) => cat && cat.id && cat.id !== null && cat.id !== undefined);

    // Validar dados antes de salvar
    try {
      if (!Array.isArray(validCategories) || !Array.isArray(products)) {
        return NextResponse.json(
          { error: "Categories e products devem ser arrays" },
          { status: 400 }
        );
      }

      // Validar categorias
      if (validCategories.length > 0) {
        validateArray(CategorySchema, validCategories, "categories");
      }

      // Validar produtos
      if (products.length > 0) {
        validateArray(MenuItemSchema, products, "products");
      }
    } catch (validationError) {
      console.error("[SYNC POST] Erro de validacao:", validationError);
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : "Erro de validacao" },
        { status: 400 }
      );
    }

    // Obter IDs atuais do banco para detectar itens a deletar
    const { data: existingCategories } = await supabase
      .from("categories")
      .select("id");
    const { data: existingProducts } = await supabase
      .from("menu_items")
      .select("id");

    const existingCategoryIds = new Set((existingCategories || []).map((c: any) => c.id));
    const existingProductIds = new Set((existingProducts || []).map((p: any) => p.id));

    const newCategoryIds = new Set(validCategories.map((c: any) => c.id));
    const newProductIds = new Set(products.map((p: any) => p.id));

    // Identificar itens a deletar (estao no banco mas nao na lista nova)
    const categoriesToDelete = [...existingCategoryIds].filter(id => !newCategoryIds.has(id));
    const productsToDelete = [...existingProductIds].filter(id => !newProductIds.has(id));

    // Deletar categorias removidas
    if (categoriesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .in("id", categoriesToDelete);

      if (deleteError) {
        console.error("Erro ao deletar categorias:", deleteError);
        return NextResponse.json(
          { error: "Erro ao deletar categorias", details: deleteError.message },
          { status: 500 }
        );
      }
    }

    // Deletar produtos removidos
    if (productsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("menu_items")
        .delete()
        .in("id", productsToDelete);

      if (deleteError) {
        console.error("Erro ao deletar produtos:", deleteError);
        return NextResponse.json(
          { error: "Erro ao deletar produtos", details: deleteError.message },
          { status: 500 }
        );
      }
    }

    // Upsert categorias (atualiza se existe, insere se novo)
    if (validCategories && validCategories.length > 0) {
      const { error: catError } = await supabase
        .from("categories")
        .upsert(validCategories, { onConflict: "id" });

      if (catError) {
        return NextResponse.json(
          { error: "Erro ao salvar categorias", details: catError.message },
          { status: 500 }
        );
      }
    }

    // Upsert produtos (atualiza se existe, insere se novo)
    if (products && products.length > 0) {
      const { error: prodError } = await supabase
        .from("menu_items")
        .upsert(products, { onConflict: "id" });

      if (prodError) {
        return NextResponse.json(
          { error: "Erro ao salvar produtos", details: prodError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dados sincronizados com sucesso!",
      categoriesCount: categories?.length || 0,
      productsCount: products?.length || 0,
      deletedCategories: categoriesToDelete.length,
      deletedProducts: productsToDelete.length,
    });
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados", details: error.message },
      { status: 500 }
    );
  }
}
