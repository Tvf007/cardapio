import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { localCache } from "@/lib/api";
import { requireAdmin } from "@/lib/authGuard";

const LOGO_ID = "__site_logo__";

// GET /api/logo - buscar logo salva
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("menu_items")
      .select("image")
      .eq("id", LOGO_ID)
      .single();

    if (error || !data) {
      return NextResponse.json({ logo: null });
    }

    return NextResponse.json({ logo: data.image || null });
  } catch {
    return NextResponse.json({ logo: null });
  }
}

// POST /api/logo - salvar logo (PROTEGIDO - requer autenticação admin)
export async function POST(request: NextRequest) {
  // SECURITY: Verificar autenticação admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { logo } = body as { logo: string | null };

    console.info("[API /logo POST] Recebido request para salvar logo", {
      isNull: logo === null,
      size: logo ? (logo.length * 3) / 4 / 1024 : 0,
    });

    if (!logo) {
      // Deletar logo
      console.info("[API /logo POST] Deletando logo");
      const { error: deleteError } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", LOGO_ID);

      if (deleteError) {
        console.error("[API /logo POST] Erro ao deletar logo:", deleteError);
        return NextResponse.json(
          { error: "Erro ao deletar logo", details: deleteError.message },
          { status: 500 }
        );
      }

      // CRITICAL FIX: Invalidate cache when logo is deleted
      localCache.invalidate("sync_data");
      console.info("[API /logo POST] Logo deletada com sucesso e cache invalidado");
      return NextResponse.json({ success: true, message: "Logo removida" });
    }

    // Salvar logo como item especial com categoria especial __hidden__
    // FIX: category não pode ser NULL (violaria NOT NULL constraint)
    // Usamos "__hidden__" como ID de categoria especial para a logo
    console.info("[API /logo POST] Fazendo upsert de logo em Supabase com categoria __hidden__");
    const { error } = await supabase.from("menu_items").upsert(
      {
        id: LOGO_ID,
        name: "Logo",
        description: "",
        price: 0,
        category: "__hidden__", // Categoria especial que não aparece no cardápio
        image: logo,
        available: false,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[API /logo POST] Erro ao fazer upsert:", error);
      return NextResponse.json(
        { error: "Erro ao salvar logo", details: error.message },
        { status: 500 }
      );
    }

    // CRITICAL FIX: Invalidate cache when logo is successfully updated
    // This ensures all devices get fresh data within 10 seconds (polling interval)
    localCache.invalidate("sync_data");
    console.info("[API /logo POST] Logo salva com sucesso em Supabase e cache invalidado");

    return NextResponse.json({
      success: true,
      message: "Logo salva com sucesso",
      logId: LOGO_ID,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[API /logo POST] Erro não tratado:", { errorMsg, error });
    return NextResponse.json(
      { error: "Erro ao salvar logo", details: errorMsg },
      { status: 500 }
    );
  }
}
