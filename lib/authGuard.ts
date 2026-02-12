/**
 * Auth Guard - Verifica autenticação em API routes server-side
 * Usado para proteger endpoints administrativos (POST /api/sync, POST /api/logo, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "./jwt";
import { checkAdminApiRateLimit, getClientIP } from "./rateLimit";

/**
 * Verifica se o request tem um token JWT válido de admin
 * Retorna null se autenticado, ou um NextResponse de erro se não
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkAdminApiRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  // Verificar token JWT do cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Não autorizado. Faça login primeiro." },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload || !payload.isAdmin) {
    return NextResponse.json(
      { error: "Sessão expirada ou inválida. Faça login novamente." },
      { status: 401 }
    );
  }

  // Autenticado com sucesso
  return null;
}
