import { NextResponse } from "next/server";
import { diagnosticCategoriesOrder } from "@/lib/turso";

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

    const categories = await diagnosticCategoriesOrder();

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
      id: String(c.id),
      name: String(c.name),
      order: c.order as number | null,
    }));

    // Diagnose issues
    if (nullOrders.length > 0) {
      result.issues.push(
        `${nullOrders.length}/${categories.length} categorias com order = NULL`
      );
      result.recommendations.push(
        'Execute SQL: UPDATE categories SET "order" = 0 WHERE "order" IS NULL;'
      );
    }

    if (zeroOrders.length === categories.length && categories.length > 1) {
      result.issues.push("CRITICO: TODAS as categorias tem order = 0");
      result.recommendations.push(
        "Problema: Turso nao esta salvando valores diferentes de 0 no campo order"
      );
    } else if (differentOrders.length > 0) {
      result.detailed_analysis = `OK: ${differentOrders.length}/${categories.length} categorias tem order correto. O sistema esta funcionando.`;
    } else {
      result.detailed_analysis =
        "AVISO: Nenhuma categoria tem order > 0. Sistema pode estar funcionando com defaults.";
    }

    if (result.issues.length === 0) {
      result.detailed_analysis =
        "DIAGNOSTICO OK: Coluna order existe e esta sendo populada corretamente.";
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
        detailed_analysis: "ERRO FATAL ao executar diagnostico",
      },
      { status: 500 }
    );
  }
}
