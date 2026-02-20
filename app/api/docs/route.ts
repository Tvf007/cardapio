/**
 * GET /api/docs - Documentação OpenAPI em JSON
 * Usado pelo Swagger UI para renderizar a documentação interativa
 */

import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
