import { MenuItem, Category, validateAndParse, SyncResponseSchema } from "./validation";

// Tipo para o callback de progresso
export type FetchProgressCallback = (status: "loading" | "success" | "error", message?: string) => void;

// Função helper para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Falha após retries");
}

// Função helper para fetch com timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  timeoutMs = 5000
): Promise<Response> {
  const { timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Função principal para sincronizar dados
export async function syncFromSupabase(
  onProgress?: FetchProgressCallback
): Promise<{ categories: Category[]; products: MenuItem[] }> {
  return retryWithBackoff(async () => {
    onProgress?.("loading", "Carregando dados do Supabase...");

    const response = await fetchWithTimeout("/api/sync", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Validar que temos as chaves necessárias
    if (!data.categories || !data.products) {
      throw new Error("Resposta inválida: faltam categories ou products");
    }

    onProgress?.("success", "Dados carregados com sucesso");
    return {
      categories: data.categories || [],
      products: data.products || [],
    };
  }, 3);
}

// Função para sincronizar para o Supabase
export async function syncToSupabase(
  products: MenuItem[],
  categories: Category[],
  onProgress?: FetchProgressCallback
): Promise<void> {
  return retryWithBackoff(async () => {
    onProgress?.("loading", "Sincronizando com Supabase...");

    const response = await fetchWithTimeout("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, categories }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    onProgress?.("success", "Dados sincronizados com sucesso");
  }, 3);
}

// Função para inicializar o banco de dados
export async function initSupabaseDatabase(
  onProgress?: FetchProgressCallback
): Promise<void> {
  return retryWithBackoff(async () => {
    onProgress?.("loading", "Inicializando banco de dados...");

    const response = await fetchWithTimeout("/api/init-supabase", {
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    onProgress?.("success", "Banco de dados inicializado");
  }, 3);
}

// Função para testar conexão
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout("/api/test", {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
