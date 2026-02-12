import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";

/**
 * GET /api/auth/me - Verificar se o usuário está autenticado
 * Valida o JWT token do cookie HTTP-only
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      // Token inválido ou expirado - limpar cookie
      const response = NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
      response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin,
      },
    });
  } catch (error) {
    console.error("[Auth Me] Erro:", error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
