import { NextResponse } from "next/server";

/**
 * Endpoint de debug para verificar variáveis de ambiente
 * Uso: GET /api/debug/env
 */
export async function GET() {
  const diagnostics = {
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    turso: {
      TURSO_CONNECTION_URL: {
        present: !!process.env.TURSO_CONNECTION_URL,
        length: process.env.TURSO_CONNECTION_URL?.length || 0,
        preview: process.env.TURSO_CONNECTION_URL?.substring(0, 40) + "..." || "N/A",
      },
      TURSO_AUTH_TOKEN: {
        present: !!process.env.TURSO_AUTH_TOKEN,
        length: process.env.TURSO_AUTH_TOKEN?.length || 0,
      },
    },
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
    },
    auth: {
      ADMIN_PASSWORD_HASH: { present: !!process.env.ADMIN_PASSWORD_HASH },
      JWT_SECRET: { present: !!process.env.JWT_SECRET },
    },
    summary: {
      tursoReady: !!process.env.TURSO_CONNECTION_URL && !!process.env.TURSO_AUTH_TOKEN,
      missingTurso: [
        !process.env.TURSO_CONNECTION_URL && "TURSO_CONNECTION_URL",
        !process.env.TURSO_AUTH_TOKEN && "TURSO_AUTH_TOKEN",
      ].filter(Boolean),
    },
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
