/**
 * Next.js Middleware para Rate Limiting
 * Aplicado a TODAS as rotas automaticamente
 *
 * Rate Limits:
 * - POST /api/sync: 10 req/min por IP
 * - POST /api/upload: 5 req/min por IP
 * - POST /api/auth/*: 5 req/min por IP
 *
 * Usa headers HTTP para armazenar contadores simples
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store para rate limiting (compartilhado entre requisições)
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const method = request.method;

  // Get client IP from headers (Netlify sets x-forwarded-for)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("cf-connecting-ip") ||
    request.ip ||
    "unknown";

  // Define rate limit rules
  const rateLimitRules = [
    {
      pattern: /^\/api\/sync$/,
      methods: ["POST"],
      limit: 10,
      window: 60, // 60 seconds
    },
    {
      pattern: /^\/api\/upload$/,
      methods: ["POST"],
      limit: 5,
      window: 60,
    },
    {
      pattern: /^\/api\/auth\/.+$/,
      methods: ["POST"],
      limit: 5,
      window: 60,
    },
  ];

  // Check if this request matches any rate limit rule
  const matchedRule = rateLimitRules.find(
    (rule) =>
      rule.pattern.test(pathname) && rule.methods.includes(method)
  );

  if (!matchedRule) {
    // No rate limit for this endpoint
    return;
  }

  // Check rate limit
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const stored = rateLimitStore.get(key);

  if (stored && now < stored.resetAt) {
    // Still within window
    if (stored.count >= matchedRule.limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((stored.resetAt - now) / 1000);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Máximo ${matchedRule.limit} requisições por minuto`,
          retryAfter,
          limit: matchedRule.limit,
          window: matchedRule.window,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": matchedRule.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              stored.resetAt
            ).toISOString(),
          },
        }
      );
    }

    // Increment count
    stored.count++;
  } else {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + matchedRule.window * 1000,
    });
  }

  // Clean up old entries (every 100 requests)
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now >= value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }

  // Allow request to proceed
  return;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
