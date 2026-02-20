import { NextRequest, NextResponse } from "next/server";
import { getLogo, saveLogo, deleteLogo } from "@/lib/turso";
import { localCache } from "@/lib/api";
import { requireAdmin } from "@/lib/authGuard";

const LOGO_ID = "__site_logo__";

// GET /api/logo - buscar logo salva
export async function GET() {
  try {
    const logo = await getLogo();
    const response = NextResponse.json({ logo });

    // Cache logo por 1 hora (muda raramente)
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=86400"
    );
    response.headers.set("X-Cache-Version", "v1");

    return response;
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
      await deleteLogo();

      // CRITICAL FIX: Invalidate cache when logo is deleted
      localCache.invalidate("sync_data");
      console.info("[API /logo POST] Logo deletada com sucesso e cache invalidado");
      return NextResponse.json({ success: true, message: "Logo removida" });
    }

    // Salvar logo como item especial com categoria especial __hidden__
    console.info("[API /logo POST] Fazendo upsert de logo em Turso com categoria __hidden__");
    await saveLogo(logo);

    // CRITICAL FIX: Invalidate cache when logo is successfully updated
    localCache.invalidate("sync_data");
    console.info("[API /logo POST] Logo salva com sucesso em Turso e cache invalidado");

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
