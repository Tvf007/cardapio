import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/jwt";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout realizado com sucesso",
  });

  // Remover cookie de autenticação
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Expira imediatamente
  });

  return response;
}
