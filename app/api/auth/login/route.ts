import { NextRequest, NextResponse } from "next/server";
import { generateToken, COOKIE_NAME } from "@/lib/jwt";
import { checkLoginRateLimit, getClientIP } from "@/lib/rateLimit";

// Hash da senha admin (SERVER-ONLY, sem NEXT_PUBLIC_)
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

/**
 * SHA-256 hash usando Web Crypto API (funciona em Edge Runtime)
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Comparação de strings em tempo constante para prevenir timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting por IP
    const clientIP = getClientIP(request);
    const rateLimit = checkLoginRateLimit(clientIP);

    if (!rateLimit.allowed) {
      const retryMinutes = Math.ceil(rateLimit.retryAfterMs / 60000);
      return NextResponse.json(
        {
          error: `Muitas tentativas de login. Tente novamente em ${retryMinutes} minuto(s).`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Senha é obrigatória" },
        { status: 400 }
      );
    }

    if (!ADMIN_PASSWORD_HASH) {
      console.error("[Auth] ADMIN_PASSWORD_HASH não configurado");
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 }
      );
    }

    // Verificar senha no SERVIDOR (hash nunca sai do backend)
    const passwordHash = await sha256(password);
    const isValid = timingSafeEqual(passwordHash, ADMIN_PASSWORD_HASH);

    if (!isValid) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      );
    }

    // Gerar JWT token
    const token = await generateToken();

    // Criar response com cookie HTTP-only seguro
    const response = NextResponse.json({
      success: true,
      user: {
        id: "admin-001",
        email: "admin@cardapio.local",
        isAdmin: true,
      },
    });

    // Cookie HTTP-only: NÃO acessível via JavaScript (protege contra XSS)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, // Não acessível via document.cookie
      secure: process.env.NODE_ENV === "production", // HTTPS only em produção
      sameSite: "lax", // Proteção contra CSRF
      path: "/",
      maxAge: 8 * 60 * 60, // 8 horas em segundos
    });

    return response;
  } catch (error) {
    console.error("[Auth Login] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao processar login" },
      { status: 500 }
    );
  }
}
