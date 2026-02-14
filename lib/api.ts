/**
 * API Client com suporte a:
 * - AbortController para cancelamento
 * - Request Queue integration
 * - Timestamp-based conflict resolution
 * - Logging detalhado
 */

import { MenuItem, Category } from "./validation";
import { validateAndSanitizeSyncData } from "./sanitize";
import {
  logger,
  getRequestQueue,
  getCrudMutex,
  ConflictResolver,
  isAbortError,
  withTimeout,
} from "./requestQueue";

// ============================================================================
// TIPOS
// ============================================================================

export type FetchProgressCallback = (
  status: "loading" | "success" | "error",
  message?: string
) => void;

export interface SyncResult {
  categories: Category[];
  products: MenuItem[];
  timestamp: number;
  fromCache?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId?: string;
}

// ============================================================================
// CONFIGURACAO
// ============================================================================

const API_CONFIG = {
  baseTimeout: 5000,
  maxRetries: 3,
  initialRetryDelay: 1000,
  syncEndpoint: "/api/sync",
  initEndpoint: "/api/init-supabase",
  testEndpoint: "/api/test",
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Funcao helper para retry com backoff exponencial
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    signal?: AbortSignal;
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? API_CONFIG.maxRetries;
  const initialDelay = options?.initialDelay ?? API_CONFIG.initialRetryDelay;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Verificar abort antes de cada tentativa
      if (options?.signal?.aborted) {
        throw new DOMException("Request aborted", "AbortError");
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Nao fazer retry se foi abortado
      if (isAbortError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);

        logger.warn("API", `Tentativa ${attempt + 1} falhou, retry em ${delay}ms`, {
          error: lastError.message,
        });

        options?.onRetry?.(attempt, lastError);

        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(resolve, delay);

          // Permitir abort durante o delay
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              reject(new DOMException("Request aborted", "AbortError"));
            });
          }
        });
      }
    }
  }

  throw lastError || new Error("Falha apos retries");
}

/**
 * Funcao helper para fetch com timeout e abort
 */
async function fetchWithAbort(
  url: string,
  options: RequestInit & {
    timeout?: number;
    externalSignal?: AbortSignal;
  } = {}
): Promise<Response> {
  const { timeout = API_CONFIG.baseTimeout, externalSignal, ...fetchOptions } = options;

  // Criar AbortController interno para timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
    logger.warn("API", `Timeout de ${timeout}ms atingido`, { url });
  }, timeout);

  // Combinar signals (externo + timeout)
  const combinedSignal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    logger.debug("API", "Iniciando fetch", { url, method: fetchOptions.method || "GET" });

    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });

    logger.debug("API", "Fetch completo", { url, status: response.status });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// CACHE LOCAL
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class LocalCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  // PERFORMANCE FIX: Aumentar TTL para 15s - Realtime cuida de invalidação quando há mudanças
  // O refresh() já invalida o cache antes de buscar, então não há risco de dados stale
  private readonly defaultTTL = 15000;

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl ?? this.defaultTTL),
    });
    logger.debug("LocalCache", "Dados cacheados", { key, ttl: ttl ?? this.defaultTTL });
  }

  get<T>(key: string): { data: T; timestamp: number } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug("LocalCache", "Cache expirado", { key });
      return null;
    }

    logger.debug("LocalCache", "Cache hit", { key, age: Date.now() - entry.timestamp });
    return { data: entry.data, timestamp: entry.timestamp };
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug("LocalCache", "Cache invalidado", { key });
  }

  invalidateAll(): void {
    this.cache.clear();
    logger.debug("LocalCache", "Todo cache invalidado");
  }
}

const localCache = new LocalCache();

// ============================================================================
// DEBOUNCE PARA SINCRONIZACAO
// ============================================================================

/**
 * Variável global para rastrear sync pendente
 * Permite que múltiplas chamadas rápidas resultem em apenas uma sincronização
 */
let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Sincroniza dados PARA o Supabase com debounce inteligente
 * Se o usuário faz múltiplas alterações rápidas (ex: mover categoria 5x),
 * apenas a última sincronização é enviada, economizando banda e evitando
 * múltiplos refreshes que causam flickering
 *
 * @param products - Lista de produtos a sincronizar
 * @param categories - Lista de categorias a sincronizar
 * @param delayMs - Atraso em ms antes de executar o sync (padrão: 500ms)
 * @returns Promise que resolve quando o sync é executado
 */
export async function syncToSupabaseDebounced(
  products: MenuItem[],
  categories: Category[],
  delayMs: number = 500
): Promise<void> {
  // Limpar timeout anterior se existir
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    logger.debug("API", "Debounce: Cancelando sync anterior");
  }

  // Agendar nova sincronização
  return new Promise((resolve, reject) => {
    syncTimeout = setTimeout(async () => {
      logger.info("API", "Debounce: Executando sync agendado", {
        delayMs,
        productsCount: products.length,
        categoriesCount: categories.length,
      });

      try {
        await syncToSupabase(products, categories);
        syncTimeout = null;
        resolve();
      } catch (error) {
        syncTimeout = null;
        logger.error("API", "Debounce: Erro ao executar sync", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        reject(error);
      }
    }, delayMs);
  });
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Sincroniza dados DO Supabase (GET)
 * Com suporte a:
 * - AbortController
 * - Request Queue
 * - Cache local
 * - Deduplication
 */
export async function syncFromSupabase(
  onProgress?: FetchProgressCallback,
  options?: {
    signal?: AbortSignal;
    skipQueue?: boolean;
    forceRefresh?: boolean;
  }
): Promise<SyncResult> {
  const requestQueue = getRequestQueue();

  // Verificar cache primeiro (se nao forcar refresh)
  if (!options?.forceRefresh) {
    const cached = localCache.get<SyncResult>("sync_data");
    if (cached) {
      logger.info("API", "Retornando dados do cache", { age: Date.now() - cached.timestamp });
      return { ...cached.data, fromCache: true };
    }
  }

  // Se skipQueue, executar direto
  if (options?.skipQueue) {
    return executeSyncFrom(options?.signal, onProgress);
  }

  // Cancelar requests de sync antigas na fila
  requestQueue.cancelOldSyncRequests();

  // Enfileirar requisicao
  const result = await requestQueue.enqueue(
    "sync_from",
    async (signal) => executeSyncFrom(signal, onProgress),
    {
      priority: "normal",
      maxRetries: 3,
    }
  );

  if (!result.success) {
    throw result.error || new Error("Sync failed");
  }

  return result.data as SyncResult;
}

/**
 * Executor real do sync FROM Supabase
 */
async function executeSyncFrom(
  signal?: AbortSignal,
  onProgress?: FetchProgressCallback
): Promise<SyncResult> {
  onProgress?.("loading", "Carregando dados do Supabase...");

  logger.info("API", "Iniciando syncFromSupabase");
  const startTime = Date.now();

  try {
    const response = await retryWithBackoff(
      async () => {
        const res = await fetchWithAbort(API_CONFIG.syncEndpoint, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          externalSignal: signal,
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "Erro desconhecido");
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        return res;
      },
      { signal }
    );

    const data = await response.json();

    if (!data.categories || !data.products) {
      throw new Error("Resposta invalida: faltam categories ou products");
    }

    // Filtrar categorias inválidas (com ID nulo ou undefined)
    const validCategories = (data.categories || []).filter(
      (c: any) => c && c.id && c.id !== null && c.id !== undefined
    );

    const syncResult: SyncResult = {
      categories: validCategories,
      products: data.products || [],
      timestamp: Date.now(),
    };

    // Cachear resultado
    localCache.set("sync_data", syncResult);

    const duration = Date.now() - startTime;
    logger.info("API", "syncFromSupabase concluido", {
      categoriesCount: syncResult.categories.length,
      productsCount: syncResult.products.length,
      duration,
    });

    onProgress?.("success", "Dados carregados com sucesso");
    return syncResult;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (isAbortError(error)) {
      logger.warn("API", "syncFromSupabase abortado", { duration });
      throw error;
    }

    logger.error("API", "syncFromSupabase falhou", {
      error: error instanceof Error ? error.message : "Unknown error",
      duration,
    });

    onProgress?.("error", error instanceof Error ? error.message : "Erro desconhecido");
    throw error;
  }
}

/**
 * Sincroniza dados PARA o Supabase (POST)
 * Com suporte a:
 * - AbortController
 * - Request Queue
 * - Mutex para garantir sequenciamento
 * - Conflict resolution
 */
export async function syncToSupabase(
  products: MenuItem[],
  categories: Category[],
  onProgress?: FetchProgressCallback,
  options?: {
    signal?: AbortSignal;
    skipQueue?: boolean;
    optimisticUpdate?: boolean;
  }
): Promise<void> {
  const requestQueue = getRequestQueue();

  logger.info("API", "Iniciando syncToSupabase", {
    productsCount: products.length,
    categoriesCount: categories.length,
  });

  // TIMEOUT PROTECTION: Garantir que a Promise sempre resolve ou rejeita
  // 30 segundos é necessário para imagens grandes (700KB+) em conexões lentas
  const timeoutPromise = new Promise<void>((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Operação de sincronização expirou. Verifique sua conexão de internet e tente novamente."));
    }, 30000); // 30 segundo timeout (aumentado de 15s para suportar imagens grandes)
  });

  try {
    // REMOVER MUTEX: Estava causando deadlocks quando havia múltiplas operações rápidas
    // A fila de requisições já garante sequenciamento adequado sem bloquear

    // Se skipQueue, executar direto (sem retries)
    if (options?.skipQueue) {
      await Promise.race([
        executeSyncTo(products, categories, options?.signal, onProgress),
        timeoutPromise,
      ]);
    } else {
      // Enfileirar requisicao com prioridade alta (operacao de escrita)
      await Promise.race([
        (async () => {
          const result = await requestQueue.enqueue(
            "sync_to",
            async (signal) => executeSyncTo(products, categories, signal, onProgress),
            {
              payload: { products, categories },
              priority: "high",
              maxRetries: 1, // Apenas 1 retry para ser rápido
              skipDeduplication: true, // Writes sempre devem executar
            }
          );

          if (!result.success) {
            throw result.error || new Error("Sync to failed");
          }
        })(),
        timeoutPromise,
      ]);
    }

    // Invalidar cache apos escrita bem-sucedida
    localCache.invalidate("sync_data");
  } catch (error) {
    logger.error("API", "syncToSupabase failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Executor real do sync TO Supabase
 */
async function executeSyncTo(
  products: MenuItem[],
  categories: Category[],
  signal?: AbortSignal,
  onProgress?: FetchProgressCallback
): Promise<void> {
  onProgress?.("loading", "Sincronizando com Supabase...");

  const startTime = Date.now();

  try {
    // Sanitizar e validar dados antes de enviar
    let sanitizedData: { products: MenuItem[]; categories: Category[] };

    try {
      sanitizedData = validateAndSanitizeSyncData(products, categories);
    } catch (sanitizeError) {
      const message = sanitizeError instanceof Error ? sanitizeError.message : "Erro ao validar dados";
      throw new Error(`Erro ao validar dados antes de sincronizar: ${message}`);
    }

    // Adicionar timestamp de atualizacao aos produtos
    const productsWithTimestamp = sanitizedData.products.map((p) => ({
      ...p,
      updated_at: new Date().toISOString(),
    }));

    // CRÍTICO FIX: O order já está correto quando chega em executeSyncTo
    const categoriesWithOrder = sanitizedData.categories;

    const bodyToSend = {
      products: productsWithTimestamp,
      categories: categoriesWithOrder,
    };

    await retryWithBackoff(
      async () => {
        const response = await fetchWithAbort(API_CONFIG.syncEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyToSend),
          credentials: "include", // SECURITY: Enviar cookie JWT para autenticação admin
          externalSignal: signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Erro desconhecido");
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      },
      { signal }
    );

    const duration = Date.now() - startTime;
    logger.info("API", "Sincronizacao concluida", { duration });

    onProgress?.("success", "Dados sincronizados com sucesso");
  } catch (error) {
    const duration = Date.now() - startTime;

    if (isAbortError(error)) {
      logger.warn("API", "Sincronizacao abortada", { duration });
      throw error;
    }

    logger.error("API", "Sincronizacao falhou", {
      error: error instanceof Error ? error.message : "Unknown error",
      duration,
    });

    onProgress?.("error", error instanceof Error ? error.message : "Erro desconhecido");
    throw error;
  }
}

/**
 * Inicializa o banco de dados
 */
export async function initSupabaseDatabase(
  onProgress?: FetchProgressCallback,
  options?: { signal?: AbortSignal }
): Promise<void> {
  logger.info("API", "Iniciando initSupabaseDatabase");

  await retryWithBackoff(
    async () => {
      onProgress?.("loading", "Inicializando banco de dados...");

      const response = await fetchWithAbort(API_CONFIG.initEndpoint, {
        method: "GET",
        externalSignal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Erro desconhecido");
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      onProgress?.("success", "Banco de dados inicializado");
    },
    { signal: options?.signal }
  );

  logger.info("API", "initSupabaseDatabase concluido");
}

/**
 * Testa conexao com o Supabase
 */
export async function testSupabaseConnection(options?: {
  signal?: AbortSignal;
}): Promise<boolean> {
  try {
    logger.debug("API", "Testando conexao");

    const response = await fetchWithAbort(API_CONFIG.testEndpoint, {
      method: "GET",
      timeout: 3000,
      externalSignal: options?.signal,
    });

    const isOk = response.ok;
    logger.debug("API", "Teste de conexao concluido", { success: isOk });
    return isOk;
  } catch (error) {
    if (isAbortError(error)) {
      logger.debug("API", "Teste de conexao abortado");
    } else {
      logger.warn("API", "Teste de conexao falhou", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return false;
  }
}

// ============================================================================
// CRUD OPERATIONS COM SEQUENCIAMENTO
// ============================================================================

/**
 * Wrapper para operacoes CRUD que garante sequenciamento
 */
export async function executeSequentialCrud<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const crudMutex = getCrudMutex();

  logger.info("API", `Iniciando operacao CRUD: ${operationName}`);

  return crudMutex.withLock(async () => {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      logger.info("API", `Operacao CRUD concluida: ${operationName}`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("API", `Operacao CRUD falhou: ${operationName}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });

      throw error;
    }
  });
}

/**
 * Resolve conflitos entre dados locais e do servidor
 */
export function resolveDataConflict<T extends { updated_at?: string; created_at?: string }>(
  local: T,
  server: T
): T {
  const resolution = ConflictResolver.resolveByTimestamp(local, server);

  logger.info("API", "Conflito resolvido", {
    winner: resolution.winner,
    reason: resolution.reason,
  });

  return resolution.data;
}

// ============================================================================
// EXPORTS ADICIONAIS
// ============================================================================

export { localCache, API_CONFIG };
