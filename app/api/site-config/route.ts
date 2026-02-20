import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig, saveSiteConfig } from "@/lib/turso";
import { requireAdmin } from "@/lib/authGuard";

/**
 * GET /api/site-config?key=horarios
 * Busca configuração do site armazenada como item especial no Turso
 * As configs ficam na tabela menu_items com id "__site_config_{key}__"
 * e category "__hidden__"
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Parametro 'key' obrigatorio" },
        { status: 400 }
      );
    }

    const rawValue = await getSiteConfig(key);

    if (!rawValue) {
      return NextResponse.json({ key, value: null });
    }

    try {
      const value = JSON.parse(rawValue);
      const response = NextResponse.json({ key, value });

      // Cache config por 6 horas (horários mudam raramente)
      response.headers.set(
        "Cache-Control",
        "public, max-age=21600, stale-while-revalidate=86400"
      );
      response.headers.set("X-Cache-Version", "v1");

      return response;
    } catch {
      const response = NextResponse.json({ key, value: null });
      // Cache null response também
      response.headers.set(
        "Cache-Control",
        "public, max-age=3600"
      );
      return response;
    }
  } catch (error) {
    console.error("[SiteConfig GET] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configuracao" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/site-config
 * Salva configuração do site (protegido por auth admin)
 * Body: { key: "horarios", value: { semana: "...", domingo: "..." } }
 */
export async function POST(request: NextRequest) {
  // SECURITY: Verificar autenticação admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: unknown };

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Campo 'key' obrigatorio" },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { error: "Campo 'value' obrigatorio" },
        { status: 400 }
      );
    }

    const serializedValue = JSON.stringify(value);
    await saveSiteConfig(key, serializedValue);

    return NextResponse.json({
      success: true,
      key,
      message: "Configuracao salva com sucesso",
    });
  } catch (error) {
    console.error("[SiteConfig POST] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao salvar configuracao",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
