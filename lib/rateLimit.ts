/**
 * Rate Limiter simples em memória para APIs
 * Protege contra brute-force e abuso
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpar entries antigas a cada 5 minutos
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    // Remover entries que não foram acessadas em 10 minutos
    if (now - entry.firstRequest > 10 * 60 * 1000) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

interface RateLimitConfig {
  /** Máximo de requests por janela */
  maxRequests: number;
  /** Janela de tempo em ms */
  windowMs: number;
  /** Tempo de bloqueio após exceder limite (ms) */
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minuto
  blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueio
};

const LOGIN_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 5 tentativas por minuto
  blockDurationMs: 15 * 60 * 1000, // 15 minutos de bloqueio após exceder
};

/**
 * Verifica rate limit para um identificador (IP ou chave)
 * Retorna true se o request deve ser permitido, false se deve ser bloqueado
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  // Se bloqueado, verificar se o bloqueio já expirou
  if (entry?.blocked) {
    if (now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.blockedUntil - now,
      };
    }
    // Bloqueio expirou, resetar
    store.delete(identifier);
  }

  if (!entry || now - entry.firstRequest > config.windowMs) {
    // Primeira request ou janela expirou
    store.set(identifier, {
      count: 1,
      firstRequest: now,
      blocked: false,
      blockedUntil: 0,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfterMs: 0,
    };
  }

  // Dentro da janela
  entry.count++;

  if (entry.count > config.maxRequests) {
    // Excedeu o limite - bloquear
    entry.blocked = true;
    entry.blockedUntil = now + config.blockDurationMs;
    store.set(identifier, entry);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: config.blockDurationMs,
    };
  }

  store.set(identifier, entry);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfterMs: 0,
  };
}

/**
 * Rate limit para login (mais restritivo)
 */
export function checkLoginRateLimit(identifier: string) {
  return checkRateLimit(`login:${identifier}`, LOGIN_CONFIG);
}

/**
 * Rate limit para APIs administrativas
 */
export function checkAdminApiRateLimit(identifier: string) {
  return checkRateLimit(`api:${identifier}`, {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests por minuto
    blockDurationMs: 2 * 60 * 1000, // 2 minutos de bloqueio
  });
}

/**
 * Extrai o IP do request para identificação
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}
