/**
 * JWT Token Management - SERVER ONLY
 * Usa a biblioteca 'jose' que funciona em Edge Runtime (Vercel)
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "8h"; // Token expira em 8 horas
const COOKIE_NAME = "admin-token";

interface AdminTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
}

function getSecretKey(): Uint8Array {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado. Defina no .env.local");
  }
  return new TextEncoder().encode(JWT_SECRET);
}

/**
 * Gera um JWT token assinado para o admin
 */
export async function generateToken(): Promise<string> {
  const token = await new SignJWT({
    sub: "admin-001",
    email: "admin@cardapio.local",
    isAdmin: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecretKey());

  return token;
}

/**
 * Verifica e decodifica um JWT token
 * Retorna null se inválido ou expirado
 */
export async function verifyToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.sub || !payload.isAdmin) {
      return null;
    }

    return payload as AdminTokenPayload;
  } catch {
    // Token inválido, expirado ou corrompido
    return null;
  }
}

/**
 * Nome do cookie para o token admin
 */
export { COOKIE_NAME };
