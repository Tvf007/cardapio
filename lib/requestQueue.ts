/**
 * Sistema de Request Queue Robusto
 *
 * Resolve os problemas de race conditions:
 * 1. Fila de requisicoes para sequenciar operacoes
 * 2. Deduplication de requests identicas
 * 3. Timestamp-based conflict resolution
 * 4. AbortController para cancelar requisicoes antigas
 * 5. Logs detalhados para debug
 */

// ============================================================================
// TIPOS
// ============================================================================

export type OperationType =
  | 'sync_from'      // GET - buscar dados
  | 'sync_to'        // POST - enviar dados
  | 'add_product'
  | 'update_product'
  | 'delete_product'
  | 'add_category'
  | 'update_category'
  | 'delete_category';

export type RequestPriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedRequest<T = unknown> {
  id: string;
  type: OperationType;
  priority: RequestPriority;
  timestamp: number;
  payload?: T;
  abortController: AbortController;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  retryCount: number;
  maxRetries: number;
  deduplicationKey?: string;
}

export interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  timestamp: number;
  requestId: string;
  wasAborted: boolean;
  wasDeduplicated: boolean;
}

export interface QueueStats {
  totalProcessed: number;
  totalDeduplicated: number;
  totalAborted: number;
  totalFailed: number;
  averageProcessingTime: number;
  currentQueueSize: number;
  isProcessing: boolean;
}

export interface ConflictResolutionData {
  entityId: string;
  entityType: 'product' | 'category';
  localTimestamp: number;
  serverTimestamp?: number;
  localData: unknown;
  serverData?: unknown;
}

// ============================================================================
// LOGGER
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

class RequestLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    // Manter apenas os ultimos N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output com formatacao
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`;
    const formattedData = data ? ` ${JSON.stringify(data, null, 0)}` : '';

    switch (level) {
      case 'debug':
        console.debug(`%c${prefix}%c ${message}${formattedData}`, 'color: gray', 'color: inherit');
        break;
      case 'info':
        console.info(`%c${prefix}%c ${message}${formattedData}`, 'color: blue', 'color: inherit');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}${formattedData}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}${formattedData}`);
        break;
    }
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  getLogs(filter?: { level?: LogLevel; category?: string; since?: Date }): LogEntry[] {
    return this.logs.filter((entry) => {
      if (filter?.level && entry.level !== filter.level) return false;
      if (filter?.category && entry.category !== filter.category) return false;
      if (filter?.since && new Date(entry.timestamp) < filter.since) return false;
      return true;
    });
  }

  clear(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new RequestLogger();

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export class ConflictResolver {
  /**
   * Resolve conflitos baseado em timestamp - Last Write Wins (LWW)
   */
  static resolveByTimestamp<T extends { updated_at?: string; created_at?: string }>(
    local: T,
    server: T
  ): { winner: 'local' | 'server'; data: T; reason: string } {
    const localTime = local.updated_at || local.created_at || '1970-01-01';
    const serverTime = server.updated_at || server.created_at || '1970-01-01';

    const localTimestamp = new Date(localTime).getTime();
    const serverTimestamp = new Date(serverTime).getTime();

    logger.debug('ConflictResolver', 'Comparando timestamps', {
      localTime,
      serverTime,
      localTimestamp,
      serverTimestamp,
    });

    if (localTimestamp >= serverTimestamp) {
      return {
        winner: 'local',
        data: local,
        reason: `Local timestamp (${localTime}) >= Server timestamp (${serverTime})`,
      };
    }

    return {
      winner: 'server',
      data: server,
      reason: `Server timestamp (${serverTime}) > Local timestamp (${localTime})`,
    };
  }

  /**
   * Resolve conflitos com merge de campos (para atualizacoes parciais)
   */
  static mergeWithPriority<T extends Record<string, unknown>>(
    base: T,
    local: Partial<T>,
    server: Partial<T>,
    localTimestamp: number,
    serverTimestamp: number
  ): T {
    const result = { ...base };

    // Campos que existem em ambos - usar timestamp para decidir
    for (const key of Object.keys(local) as Array<keyof T>) {
      if (key in server) {
        // Ambos modificaram - usa timestamp
        if (localTimestamp >= serverTimestamp) {
          result[key] = local[key] as T[keyof T];
        } else {
          result[key] = server[key] as T[keyof T];
        }
      } else {
        // So local modificou
        result[key] = local[key] as T[keyof T];
      }
    }

    // Campos que so existem no servidor
    for (const key of Object.keys(server) as Array<keyof T>) {
      if (!(key in local)) {
        result[key] = server[key] as T[keyof T];
      }
    }

    return result;
  }

  /**
   * Detecta se ha conflito real (ambos modificaram o mesmo dado)
   */
  static hasConflict<T extends Record<string, unknown>>(
    original: T,
    local: T,
    server: T
  ): { hasConflict: boolean; conflictingFields: string[] } {
    const conflictingFields: string[] = [];

    for (const key of Object.keys(original)) {
      const originalValue = JSON.stringify(original[key]);
      const localValue = JSON.stringify(local[key]);
      const serverValue = JSON.stringify(server[key]);

      // Conflito: ambos mudaram, mas para valores diferentes
      if (localValue !== originalValue && serverValue !== originalValue && localValue !== serverValue) {
        conflictingFields.push(key);
      }
    }

    return {
      hasConflict: conflictingFields.length > 0,
      conflictingFields,
    };
  }
}

// ============================================================================
// REQUEST QUEUE
// ============================================================================

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private stats: QueueStats = {
    totalProcessed: 0,
    totalDeduplicated: 0,
    totalAborted: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    currentQueueSize: 0,
    isProcessing: false,
  };

  private processingTimes: number[] = [];
  private pendingRequests: Map<string, QueuedRequest> = new Map();
  private activeRequest: QueuedRequest | null = null;
  private lastSyncTimestamp = 0;
  private onQueueEmpty?: () => void;

  constructor(options?: { onQueueEmpty?: () => void }) {
    this.onQueueEmpty = options?.onQueueEmpty;
  }

  /**
   * Gera um ID unico para a requisicao
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera chave de deduplicacao baseada no tipo e payload
   */
  private generateDeduplicationKey(type: OperationType, payload?: unknown): string {
    const payloadStr = payload ? JSON.stringify(payload) : '';
    return `${type}:${payloadStr}`;
  }

  /**
   * Verifica se uma requisicao ja existe na fila (deduplication)
   */
  private findDuplicateRequest(deduplicationKey: string): QueuedRequest | undefined {
    return this.queue.find((req) => req.deduplicationKey === deduplicationKey);
  }

  /**
   * Ordena a fila por prioridade e timestamp
   */
  private sortQueue(): void {
    const priorityOrder: Record<RequestPriority, number> = {
      critical: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    this.queue.sort((a, b) => {
      // Primeiro por prioridade (maior primeiro)
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Depois por timestamp (mais antigo primeiro)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Adiciona uma requisicao a fila
   */
  async enqueue<T, R>(
    type: OperationType,
    executor: (signal: AbortSignal, payload?: T) => Promise<R>,
    options?: {
      payload?: T;
      priority?: RequestPriority;
      maxRetries?: number;
      skipDeduplication?: boolean;
    }
  ): Promise<RequestResult<R>> {
    const requestId = this.generateRequestId();
    const timestamp = Date.now();
    const priority = options?.priority || 'normal';
    const maxRetries = options?.maxRetries ?? 3;
    const deduplicationKey = options?.skipDeduplication
      ? undefined
      : this.generateDeduplicationKey(type, options?.payload);

    logger.info('RequestQueue', `Enfileirando requisicao`, {
      requestId,
      type,
      priority,
      deduplicationKey: deduplicationKey?.substring(0, 50),
    });

    // Verificar deduplicacao
    if (deduplicationKey) {
      const duplicateRequest = this.findDuplicateRequest(deduplicationKey);
      if (duplicateRequest) {
        logger.info('RequestQueue', `Requisicao duplicada encontrada, reutilizando`, {
          originalRequestId: duplicateRequest.id,
          newRequestId: requestId,
        });

        this.stats.totalDeduplicated++;

        // Retorna a promise da requisicao existente
        return new Promise((resolve) => {
          const originalResolve = duplicateRequest.resolve;
          duplicateRequest.resolve = (value) => {
            originalResolve(value);
            resolve({
              ...value as RequestResult<R>,
              wasDeduplicated: true,
            });
          };
        });
      }
    }

    // Criar nova requisicao
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();

      const request: QueuedRequest = {
        id: requestId,
        type,
        priority,
        timestamp,
        payload: options?.payload,
        abortController,
        resolve: (result) => resolve(result as RequestResult<R>),
        reject,
        retryCount: 0,
        maxRetries,
        deduplicationKey,
      };

      // Adicionar executor ao request (usando closure)
      (request as QueuedRequest & { executor: typeof executor }).executor = executor;

      this.queue.push(request);
      this.pendingRequests.set(requestId, request);
      this.stats.currentQueueSize = this.queue.length;

      logger.debug('RequestQueue', `Requisicao adicionada a fila`, {
        requestId,
        queueSize: this.queue.length,
      });

      // Ordenar e processar
      this.sortQueue();
      this.processQueue();
    });
  }

  /**
   * Processa a fila de requisicoes
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.stats.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      this.activeRequest = request;
      this.stats.currentQueueSize = this.queue.length;

      logger.info('RequestQueue', `Processando requisicao`, {
        requestId: request.id,
        type: request.type,
        retryCount: request.retryCount,
      });

      const startTime = Date.now();

      try {
        // Verificar se foi abortada antes de executar
        if (request.abortController.signal.aborted) {
          logger.warn('RequestQueue', `Requisicao abortada antes de executar`, {
            requestId: request.id,
          });

          this.stats.totalAborted++;
          request.resolve({
            success: false,
            error: new Error('Request aborted'),
            timestamp: Date.now(),
            requestId: request.id,
            wasAborted: true,
            wasDeduplicated: false,
          });
          continue;
        }

        // Executar a requisicao
        const executor = (request as QueuedRequest & { executor: (signal: AbortSignal, payload?: unknown) => Promise<unknown> }).executor;
        const result = await executor(request.abortController.signal, request.payload);

        const processingTime = Date.now() - startTime;
        this.updateProcessingTime(processingTime);
        this.stats.totalProcessed++;
        this.lastSyncTimestamp = Date.now();

        logger.info('RequestQueue', `Requisicao concluida com sucesso`, {
          requestId: request.id,
          processingTime,
        });

        request.resolve({
          success: true,
          data: result,
          timestamp: Date.now(),
          requestId: request.id,
          wasAborted: false,
          wasDeduplicated: false,
        });

      } catch (error) {
        const processingTime = Date.now() - startTime;

        // Verificar se foi erro de abort
        if (error instanceof Error && error.name === 'AbortError') {
          logger.warn('RequestQueue', `Requisicao abortada durante execucao`, {
            requestId: request.id,
          });

          this.stats.totalAborted++;
          request.resolve({
            success: false,
            error,
            timestamp: Date.now(),
            requestId: request.id,
            wasAborted: true,
            wasDeduplicated: false,
          });
          continue;
        }

        // Tentar retry se possivel
        if (request.retryCount < request.maxRetries) {
          request.retryCount++;

          logger.warn('RequestQueue', `Tentando retry`, {
            requestId: request.id,
            attempt: request.retryCount,
            maxRetries: request.maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Adicionar de volta a fila com delay
          await this.delay(Math.pow(2, request.retryCount) * 500);

          if (!request.abortController.signal.aborted) {
            this.queue.unshift(request); // Adiciona no inicio para processar logo
            this.stats.currentQueueSize = this.queue.length;
          }
          continue;
        }

        // Falha definitiva
        logger.error('RequestQueue', `Requisicao falhou apos todas tentativas`, {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime,
        });

        this.stats.totalFailed++;
        request.resolve({
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
          requestId: request.id,
          wasAborted: false,
          wasDeduplicated: false,
        });
      } finally {
        this.pendingRequests.delete(request.id);
        this.activeRequest = null;
      }
    }

    this.processing = false;
    this.stats.isProcessing = false;

    logger.debug('RequestQueue', 'Fila vazia, processamento concluido');
    this.onQueueEmpty?.();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Atualiza estatisticas de tempo de processamento
   */
  private updateProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    this.stats.averageProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Cancela todas as requisicoes pendentes de um tipo
   */
  cancelByType(type: OperationType): number {
    let cancelled = 0;

    this.queue = this.queue.filter((request) => {
      if (request.type === type) {
        request.abortController.abort();
        cancelled++;
        return false;
      }
      return true;
    });

    // Cancelar requisicao ativa se for do tipo
    if (this.activeRequest?.type === type) {
      this.activeRequest.abortController.abort();
      cancelled++;
    }

    logger.info('RequestQueue', `Requisicoes canceladas por tipo`, { type, cancelled });
    this.stats.currentQueueSize = this.queue.length;
    return cancelled;
  }

  /**
   * Cancela requisicao especifica
   */
  cancelById(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (request) {
      request.abortController.abort();
      this.queue = this.queue.filter((r) => r.id !== requestId);
      this.stats.currentQueueSize = this.queue.length;
      logger.info('RequestQueue', `Requisicao cancelada`, { requestId });
      return true;
    }
    return false;
  }

  /**
   * Cancela todas as requisicoes de sync antigas
   * (util quando uma nova sync e iniciada)
   */
  cancelOldSyncRequests(): number {
    return this.cancelByType('sync_from');
  }

  /**
   * Retorna estatisticas da fila
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Retorna o ultimo timestamp de sincronizacao
   */
  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  /**
   * Limpa a fila (aborta todas as requisicoes)
   */
  clear(): void {
    for (const request of this.queue) {
      request.abortController.abort();
    }
    if (this.activeRequest) {
      this.activeRequest.abortController.abort();
    }
    this.queue = [];
    this.pendingRequests.clear();
    this.stats.currentQueueSize = 0;
    logger.info('RequestQueue', 'Fila limpa');
  }

  /**
   * Verifica se ha requisicoes pendentes
   */
  hasPendingRequests(): boolean {
    return this.queue.length > 0 || this.processing;
  }

  /**
   * Espera todas as requisicoes pendentes terminarem
   */
  async waitForAll(): Promise<void> {
    while (this.hasPendingRequests()) {
      await this.delay(100);
    }
  }
}

// ============================================================================
// OPERACOES SEQUENCIADAS
// ============================================================================

/**
 * Mutex simples para garantir operacoes sequenciais
 */
export class OperationMutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      logger.debug('OperationMutex', 'Lock adquirido');
      return;
    }

    logger.debug('OperationMutex', 'Aguardando lock', { waitQueueSize: this.waitQueue.length });

    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()!;
      logger.debug('OperationMutex', 'Passando lock para proximo', { waitQueueSize: this.waitQueue.length });
      next();
    } else {
      this.locked = false;
      logger.debug('OperationMutex', 'Lock liberado');
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  getWaitQueueSize(): number {
    return this.waitQueue.length;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

// Instancia global da fila de requisicoes
let globalRequestQueue: RequestQueue | null = null;

export function getRequestQueue(): RequestQueue {
  if (!globalRequestQueue) {
    globalRequestQueue = new RequestQueue();
    logger.info('RequestQueue', 'Fila de requisicoes global criada');
  }
  return globalRequestQueue;
}

// Instancia global do mutex para operacoes CRUD
let globalCrudMutex: OperationMutex | null = null;

export function getCrudMutex(): OperationMutex {
  if (!globalCrudMutex) {
    globalCrudMutex = new OperationMutex();
    logger.info('OperationMutex', 'Mutex CRUD global criado');
  }
  return globalCrudMutex;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce com suporte a abort
 */
export function createDebouncedRequest<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number
): { execute: T; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let abortController: AbortController | null = null;

  const execute = ((...args: unknown[]) => {
    // Cancelar execucao anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();
    const currentController = abortController;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (currentController.signal.aborted) {
          reject(new Error('Debounced request cancelled'));
          return;
        }
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  return { execute, cancel };
}

/**
 * Wrapper para executar operacao com timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Verifica se um erro foi causado por abort
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'));
}
