import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

// POST /api/logo - salvar logo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logo } = body as { logo: string | null };

    if (!logo) {
      // Deletar logo
      await supabase.from("menu_items").delete().eq("id", LOGO_ID);
      return NextResponse.json({ success: true, message: "Logo removida" });
    }

    // Salvar logo como item especial (nao aparece no cardapio pois tem category __system__)
    const { error } = await supabase.from("menu_items").upsert(
      {
        id: LOGO_ID,
        name: "Logo",
        description: "",
        price: 0,
        category: "__system__",
        image: logo,
        available: false,
      },
      { onConflict: "id" }
    );

    if (error) {
      return NextResponse.json(
        { error: "Erro ao salvar logo", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Logo salva com sucesso" });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao salvar logo", details: error instanceof Error ? error.message : "Erro" },
      { status: 500 }
    );
  }
}
