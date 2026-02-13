import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface DiagnosticResult {
  timestamp: string;
  summary: {
    total_categories: number;
    with_null_order: number;
    with_zero_order: number;
    with_different_orders: number;
  };
  issues: string[];
  recommendations: string[];
  sample_categories: Array<{ id: string; name: string; order: number | null }>;
  detailed_analysis: string;
}

export async function GET(): Promise<NextResponse<DiagnosticResult>> {
  try {
    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      summary: {
        total_categories: 0,
        with_null_order: 0,
        with_zero_order: 0,
        with_different_orders: 0,
      },
      issues: [],
      recommendations: [],
      sample_categories: [],
      detailed_analysis: "",
    };

    // Fetch all categories
    const { data: categories, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, order")
      .order("id");

    if (fetchError) {
      result.issues.push(`Erro ao buscar categorias: ${fetchError.message}`);
      result.detailed_analysis = `ERRO CRÍTICO: Não conseguiu buscar dados do Supabase. ${fetchError.message}`;
      return NextResponse.json(result, { status: 500 });
    }

    if (!categories || categories.length === 0) {
      result.detailed_analysis = "AVISO: Nenhuma categoria encontrada no banco.";
      return NextResponse.json(result);
    }

    // Analyze data
    result.summary.total_categories = categories.length;

    const nullOrders = categories.filter((c: any) => c.order === null || c.order === undefined);
    const zeroOrders = categories.filter((c: any) => c.order === 0);
    const differentOrders = categories.filter(
      (c: any) => typeof c.order === "number" && c.order > 0
    );

    result.summary.with_null_order = nullOrders.length;
    result.summary.with_zero_order = zeroOrders.length;
    result.summary.with_different_orders = differentOrders.length;

    result.sample_categories = categories.slice(0, 5).map((c: any) => ({
      id: c.id,
      name: c.name,
      order: c.order,
    }));

    // Diagnose issues
    if (nullOrders.length > 0) {
      result.issues.push(
        `${nullOrders.length}/${categories.length} categorias com order = NULL`
      );
      result.recommendations.push(
        "Execute SQL: UPDATE categories SET \"order\" = 0 WHERE \"order\" IS NULL;"
      );
    }

    if (zeroOrders.length === categories.length && categories.length > 1) {
      result.issues.push("CRÍTICO: TODAS as categorias têm order = 0");
      result.recommendations.push(
        "Problema: Supabase não está salvando valores diferentes de 0 no campo order"
      );
      result.recommendations.push(
        "Verificar se há RLS Policy bloqueando UPDATE de 'order'"
      );
      result.recommendations.push(
        "Verificar se há Trigger resetando order para 0 após UPDATE"
      );
      result.detailed_analysis =
        "PROBLEMA RAIZ: O campo 'order' não está sendo persistido corretamente. Quando reordenações são feitas, os valores corretos chegam ao Supabase mas são ignorados/resetados para 0.";
    } else if (differentOrders.length > 0) {
      result.detailed_analysis = `OK: ${differentOrders.length}/${categories.length} categorias têm order correto. O sistema está funcionando.`;
    } else {
      result.detailed_analysis =
        "AVISO: Nenhuma categoria tem order > 0. Sistema pode estar funcionando com defaults.";
    }

    if (result.issues.length === 0) {
      result.detailed_analysis =
        "✓ DIAGNÓSTICO OK: Coluna order existe e está sendo populada corretamente.";
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        summary: { total_categories: 0, with_null_order: 0, with_zero_order: 0, with_different_orders: 0 },
        issues: [error instanceof Error ? error.message : "Erro desconhecido"],
        recommendations: [],
        sample_categories: [],
        detailed_analysis: "ERRO FATAL ao executar diagnóstico",
      },
      { status: 500 }
    );
  }
}
