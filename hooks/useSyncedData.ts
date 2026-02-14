"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { syncFromSupabase, localCache } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface BroadcastMessage {
  type: "sync" | "update";
  data?: {
    categories?: Category[];
    products?: MenuItem[];
    logo?: string | null;
  };
  timestamp: number;
}

export interface SyncedDataState {
  categories: Category[];
  products: MenuItem[];
  logo: string | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  realtimeConnected: boolean;
}

// PERFORMANCE FIX: Polling a cada 30s (Realtime cuida da sync rápida)
const POLL_INTERVAL = 30000;
const DEBOUNCE_DELAY = 200; // Reduzido de 800ms para 200ms para melhor responsividade em reorders

// IDs de sistema que não devem aparecer no cardápio público
const HIDDEN_CATEGORY_ID = "__hidden__";
const LOGO_ITEM_ID = "__site_logo__";

/**
 * Filtra categorias e produtos de sistema (logo, __hidden__)
 * para que não apareçam no cardápio público
 */
function filterSystemItems(
  categories: Category[],
  products: MenuItem[]
): { categories: Category[]; products: MenuItem[]; logo: string | null } {
  let logo: string | null = null;

  // Filtrar categoria __hidden__ das categorias visíveis
  const visibleCategories = categories.filter(
    (c) => c.id !== HIDDEN_CATEGORY_ID
  );

  // Filtrar logo, site_config e produtos com categoria __hidden__
  const visibleProducts = products.filter((p) => {
    if (p.id === LOGO_ITEM_ID) {
      logo = p.image || null;
      return false;
    }
    if (p.id.startsWith("__site_config_")) {
      return false;
    }
    if (p.category === HIDDEN_CATEGORY_ID) {
      return false;
    }
    return true;
  });

  // Ordenar categorias pelo campo order (menor primeiro)
  const sortedCategories = [...visibleCategories].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999)
  );

  return { categories: sortedCategories, products: visibleProducts, logo };
}

export function useSyncedData(): SyncedDataState & {
  refresh: () => Promise<void>;
  setOptimisticData: (data: { categories?: Category[]; products?: MenuItem[] }) => void;
} {
  // FIX HYDRATION: Sempre iniciar com estado vazio para evitar mismatch SSR/cliente
  // O localStorage é carregado via useEffect após a hidratação
  const [state, setState] = useState<SyncedDataState>({
    categories: [],
    products: [],
    logo: null,
    loading: true,
    error: null,
    lastSync: null,
    realtimeConnected: false,
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const hasLoadedCacheRef = useRef(false);

  const saveToLocalStorage = useCallback((categories: Category[], products: MenuItem[], logo: string | null) => {
    try {
      localStorage.setItem("cardapio-categories", JSON.stringify(categories));
      localStorage.setItem("cardapio-products", JSON.stringify(products));
      if (logo) {
        localStorage.setItem("padaria-logo", logo);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const loadFromLocalStorage = useCallback((): { categories: Category[]; products: MenuItem[]; logo: string | null } => {
    const result = { categories: [] as Category[], products: [] as MenuItem[], logo: null as string | null };
    try {
      const cat = localStorage.getItem("cardapio-categories");
      if (cat) result.categories = JSON.parse(cat);
    } catch {
      localStorage.removeItem("cardapio-categories");
    }
    try {
      const prod = localStorage.getItem("cardapio-products");
      if (prod) result.products = JSON.parse(prod);
    } catch {
      localStorage.removeItem("cardapio-products");
    }
    try {
      const logo = localStorage.getItem("padaria-logo");
      if (logo) result.logo = logo;
    } catch {
      // ignore
    }
    return result;
  }, []);

  const broadcastUpdate = useCallback((categories: Category[], products: MenuItem[], logo: string | null) => {
    try {
      broadcastChannelRef.current?.postMessage({
        type: "sync",
        data: { categories, products, logo },
        timestamp: Date.now(),
      } as BroadcastMessage);
    } catch {
      // BroadcastChannel may be closed
    }
  }, []);

  const setOptimisticData = useCallback((data: { categories?: Category[]; products?: MenuItem[] }) => {
    setState((prev) => ({
      ...prev,
      categories: data.categories ?? prev.categories,
      products: data.products ?? prev.products,
    }));
  }, []);

  const refresh = useCallback(async (retryCount = 0, maxRetries = 2) => {
    if (!mountedRef.current) return;

    // Evitar refreshes simultâneos
    if (isRefreshingRef.current && retryCount === 0) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      // Invalidar cache para garantir dados frescos do Supabase
      localCache.invalidate("sync_data");

      const data = await syncFromSupabase(undefined, { forceRefresh: true });

      if (!mountedRef.current) return;

      // NÃO filtrar categorias aqui! Precisamos manter TODAS para sincronização
      // Apenas filtrar produtos e logo, e ordenar categorias
      let logo: string | null = null;
      const visibleProducts = data.products.filter((p) => {
        if (p.id === LOGO_ITEM_ID) {
          logo = p.image || null;
          return false;
        }
        if (p.id.startsWith("__site_config_")) {
          return false;
        }
        if (p.category === HIDDEN_CATEGORY_ID) {
          return false;
        }
        return true;
      });

      // Ordenar todas as categorias pelo campo order, MAS NÃO REMOVER as ocultas
      const categories = [...data.categories].sort(
        (a, b) => (a.order ?? 999) - (b.order ?? 999)
      );
      const products = visibleProducts;

      // Fallback localStorage apenas se Supabase não retornou logo
      let finalLogo: string | null = logo;
      if (!finalLogo) {
        try {
          const fallbackLogo = localStorage.getItem("padaria-logo");
          if (fallbackLogo) {
            finalLogo = fallbackLogo;
            console.info("[useSyncedData] Logo recuperada do localStorage (fallback)");
          }
        } catch {
          // localStorage unavailable
        }
      } else {
        // Salvar logo do Supabase em localStorage para redundância
        try {
          localStorage.setItem("padaria-logo", finalLogo);
        } catch {
          // localStorage unavailable
        }
      }

      setState({
        categories,
        products,
        logo: finalLogo,
        loading: false,
        error: null,
        lastSync: new Date(),
        realtimeConnected: state.realtimeConnected,
      });

      saveToLocalStorage(categories, products, finalLogo);
      broadcastUpdate(categories, products, finalLogo);
    } catch (error) {
      if (!mountedRef.current) return;

      // Retry automático com backoff exponencial
      if (retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.warn(
          `[useSyncedData] Sincronização falhou. Tentando novamente em ${delayMs}ms... (tentativa ${retryCount + 1}/${maxRetries})`
        );
        setTimeout(() => {
          refresh(retryCount + 1, maxRetries);
        }, delayMs);
        return;
      }

      // Somente usar localStorage como fallback se não tem dados ainda
      const fallback = loadFromLocalStorage();
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";

      setState((prev) => ({
        ...prev,
        categories: prev.categories.length > 0 ? prev.categories : fallback.categories,
        products: prev.products.length > 0 ? prev.products : fallback.products,
        logo: prev.logo || fallback.logo,
        loading: false,
        error: `Erro ao sincronizar (tentativas exauridas): ${errorMsg}`,
        lastSync: new Date(),
      }));

      console.error("[useSyncedData] Erro após múltiplas tentativas:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveToLocalStorage, loadFromLocalStorage, broadcastUpdate]);

  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      refresh();
    }, DEBOUNCE_DELAY);
  }, [refresh]);

  // PERFORMANCE: Carregar cache do localStorage APÓS hidratação (evita React #418)
  useEffect(() => {
    if (hasLoadedCacheRef.current) return;
    hasLoadedCacheRef.current = true;

    try {
      const cached = loadFromLocalStorage();
      if (cached.categories.length > 0 || cached.products.length > 0) {
        // NÃO filtrar categorias do cache! Precisamos de TODAS para sincronização
        // Apenas filtrar produtos e logo
        let logo = cached.logo;
        const visibleProducts = cached.products.filter((p) => {
          if (p.id === LOGO_ITEM_ID) {
            logo = p.image || logo;
            return false;
          }
          if (p.id.startsWith("__site_config_")) {
            return false;
          }
          if (p.category === HIDDEN_CATEGORY_ID) {
            return false;
          }
          return true;
        });

        // Ordenar categorias mas manter TODAS (incluindo ocultas)
        const sortedCategories = [...cached.categories].sort(
          (a, b) => (a.order ?? 999) - (b.order ?? 999)
        );

        setState((prev) => ({
          ...prev,
          categories: sortedCategories,
          products: visibleProducts,
          logo: logo || prev.logo,
          loading: false, // Temos cache, não precisa mostrar loading
        }));
        console.info("[useSyncedData] Dados carregados do cache local");
      }
    } catch {
      // Sem cache disponível, aguardar fetch do Supabase
    }
  }, [loadFromLocalStorage]);

  useEffect(() => {
    mountedRef.current = true;

    // Carregar dados do Supabase (em background se já temos cache)
    refresh();

    // BroadcastChannel para sync entre abas DO MESMO DISPOSITIVO
    try {
      broadcastChannelRef.current = new BroadcastChannel("cardapio-sync");
      broadcastChannelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        if (event.data.type === "sync" && event.data.data) {
          const { categories, products, logo } = event.data.data;
          setState((prev) => ({
            ...prev,
            categories: categories || prev.categories,
            products: products || prev.products,
            logo: logo !== undefined ? logo : prev.logo,
          }));
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    // DESABILITADO: Supabase Realtime causava race condition
    // - Realtime dispara refresh enquanto POST /api/sync ainda está sendo processado
    // - refresh() busca dados antes do POST ser confirmado pelo servidor
    // - Resultado: UI reverte para dados antigos após 6-8 segundos
    // SOLUÇÃO: Usar apenas polling (30s) como sincronização confiável
    // FIX DATE: 2026-02-14
    /*
    const channel = supabase
      .channel("cardapio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          debouncedRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          // Quando menu_items muda (incluindo logo!), refresh com debounce
          debouncedRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setState((prev) => ({ ...prev, realtimeConnected: true }));
          console.info("[useSyncedData] Realtime conectado com sucesso");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setState((prev) => ({ ...prev, realtimeConnected: false }));
          console.warn("[useSyncedData] Realtime desconectado, dependendo do polling");
        }
      });
    */

    // FALLBACK: Criar channel dummy para compatibilidade, mas não subscribir
    const channel = supabase.channel("cardapio-realtime-disabled");

    // Polling a cada 30s como backup do Realtime
    pollIntervalRef.current = setInterval(() => {
      refresh();
    }, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      channel.unsubscribe();
      broadcastChannelRef.current?.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [refresh, debouncedRefresh]);

  return {
    ...state,
    refresh,
    setOptimisticData,
  };
}
