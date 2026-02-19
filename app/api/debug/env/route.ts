import { NextResponse } from "next/server";

/**
 * Endpoint de debug APENAS para development/diagnostico
 * NÃO usar em produção - expõe informações sensíveis
 *
 * Uso: GET /api/debug/env
 */
export async function GET() {
  // Verificar se é request local (apenas para segurança básica)
  const isDevEnvironment = process.env.NODE_ENV !== "production";

  const diagnostics = {
    nodeEnv: process.env.NODE_ENV,
    isDevEnv: isDevEnvironment,
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        preview:
          process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "..." || "N/A",
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        preview:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + "..." || "N/A",
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        preview:
          process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) + "..." || "N/A",
      },
      ADMIN_PASSWORD_HASH: {
        present: !!process.env.ADMIN_PASSWORD_HASH,
        length: process.env.ADMIN_PASSWORD_HASH?.length || 0,
      },
      JWT_SECRET: {
        present: !!process.env.JWT_SECRET,
        length: process.env.JWT_SECRET?.length || 0,
      },
    },
    summary: {
      allRequiredPresent:
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      missingVariables: [
        !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
        !process.env.ADMIN_PASSWORD_HASH && "ADMIN_PASSWORD_HASH",
        !process.env.JWT_SECRET && "JWT_SECRET",
      ].filter(Boolean),
    },
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
