import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import {
  getAdicionais,
  getAdicionaisForProduct,
  createAdicional,
  updateAdicional,
  deleteAdicional,
  setProductAdicionais,
  getProductAdicionaisIds,
} from "@/lib/turso";
import { requireAdmin } from "@/lib/authGuard";

/**
 * GET /api/adicionais
 * GET /api/adicionais?product_id=xxx  → adicionais de um produto específico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (productId) {
      const adicionais = await getAdicionaisForProduct(productId);
      return NextResponse.json({ adicionais });
    }

    const adicionais = await getAdicionais();
    return NextResponse.json({ adicionais });
  } catch (error) {
    console.error("[ADICIONAIS] Erro ao buscar:", error);
    return NextResponse.json({ error: "Erro ao buscar adicionais" }, { status: 500 });
  }
}

/**
 * POST /api/adicionais
 * Ações disponíveis via body.action:
 *   "create"          → criar novo adicional
 *   "update"          → editar adicional
 *   "delete"          → remover adicional
 *   "set-product"     → definir adicionais de um produto
 *   "get-product-ids" → buscar IDs de adicionais de um produto
 */
export async function POST(request: NextRequest) {
  // "get-product-ids" é leitura mas precisa de body — dispensar auth
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { action } = body;

  // Leitura de IDs de produto — não exige admin
  if (action === "get-product-ids") {
    const { product_id } = body;
    if (!product_id) {
      return NextResponse.json({ error: "product_id obrigatório" }, { status: 400 });
    }
    try {
      const ids = await getProductAdicionaisIds(product_id);
      return NextResponse.json({ ids });
    } catch (error) {
      return NextResponse.json({ error: "Erro ao buscar IDs" }, { status: 500 });
    }
  }

  // Demais ações requerem autenticação admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    if (action === "create") {
      const { name, price } = body;
      if (!name?.trim()) {
        return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
      }
      const id = uuid();
      await createAdicional(id, name.trim(), parseFloat(price) || 0);
      return NextResponse.json({ success: true, id });
    }

    if (action === "update") {
      const { id, name, price } = body;
      if (!id || !name?.trim()) {
        return NextResponse.json({ error: "ID e nome obrigatórios" }, { status: 400 });
      }
      await updateAdicional(id, name.trim(), parseFloat(price) || 0);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
      }
      await deleteAdicional(id);
      return NextResponse.json({ success: true });
    }

    if (action === "set-product") {
      const { product_id, adicional_ids } = body;
      if (!product_id) {
        return NextResponse.json({ error: "product_id obrigatório" }, { status: 400 });
      }
      await setProductAdicionais(product_id, adicional_ids || []);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("[ADICIONAIS] Erro ao processar:", error);
    return NextResponse.json({ error: "Erro ao processar requisição" }, { status: 500 });
  }
}
