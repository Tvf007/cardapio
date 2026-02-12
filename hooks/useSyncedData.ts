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

// PERFORMANCE FIX: Aumentar polling para 30s (Realtime cuida da sync rápida)
const POLL_INTERVAL = 30000;
const DEBOUNCE_DELAY = 800;

export function useSyncedData(): SyncedDataState & {
  refresh: () => Promise<void>;
  setOptimisticData: (data: { categories?: Category[]; products?: MenuItem[] }) => void;
} {
  // PERFORMANCE FIX: Iniciar com dados do localStorage para evitar flash de loading
  const [state, setState] = useState<SyncedDataState>(() => {
    // Tentar carregar do localStorage para primeiro render instantâneo
    if (typeof window !== "undefined") {
      try {
        const cachedCat = localStorage.getItem("cardapio-categories");
        const cachedProd = localStorage.getItem("cardapio-products");
        const cachedLogo = localStorage.getItem("padaria-logo");
        const categories = cachedCat ? JSON.parse(cachedCat) : [];
        const products = cachedProd ? JSON.parse(cachedProd) : [];

        if (categories.length > 0 || products.length > 0) {
          return {
            categories,
            products,
            logo: cachedLogo || null,
            loading: false, // Já temos dados em cache, não mostrar loading
            error: null,
            lastSync: null,
            realtimeConnected: false,
          };
        }
      } catch {
        // Fallback para estado vazio
      }
    }

    return {
      categories: [],
      products: [],
      logo: null,
      loading: true,
      error: null,
      lastSync: null,
      realtimeConnected: false,
    };
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false); // Evitar refreshes simultâneos

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

  const loadFromLocalStorage = useCallback((): { categories: Category[]; products: MenuItem[] } => {
    const result = { categories: [] as Category[], products: [] as MenuItem[] };
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

    // PERFORMANCE FIX: Evitar refreshes simultâneos
    if (isRefreshingRef.current && retryCount === 0) {
      console.debug("[useSyncedData] Refresh já em andamento, ignorando");
      return;
    }

    isRefreshingRef.current = true;

    try {
      // CRITICAL FIX: Invalidar cache para garantir dados frescos do Supabase
      // Isso é essencial para sincronização de logo entre dispositivos
      localCache.invalidate("sync_data");

      const data = await syncFromSupabase(undefined, { forceRefresh: true });

      if (!mountedRef.current) return;

      // CRITICAL: Extrair logo dos produtos (se existir item especial __site_logo__)
      let logo: string | null = null;
      const productsWithoutLogo = data.products.filter((p) => {
        if (p.id === "__site_logo__") {
          logo = p.image || null;
          return false; // Filtrar logo dos produtos reais
        }
        return true;
      });

      // Fallback localStorage apenas se Supabase não retornou logo
      if (!logo) {
        try {
          const fallbackLogo = localStorage.getItem("padaria-logo");
          if (fallbackLogo) {
            logo = fallbackLogo;
            console.info("[useSyncedData] Logo recuperada do localStorage (fallback)");
          }
        } catch (err) {
          console.warn("[useSyncedData] Erro ao acessar localStorage para fallback logo:", err);
        }
      } else {
        // Se recebemos logo de Supabase, salvar em localStorage para redundância
        try {
          localStorage.setItem("padaria-logo", logo);
        } catch {
          // localStorage unavailable
        }
      }

      setState((prev) => ({
        ...prev,
        categories: data.categories,
        products: productsWithoutLogo,
        logo: logo,
        loading: false,
        error: null,
        lastSync: new Date(),
      }));

      saveToLocalStorage(data.categories, productsWithoutLogo, logo);
      broadcastUpdate(data.categories, productsWithoutLogo, logo);
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

      // Somente usar localStorage como fallback se nao tem dados ainda
      const fallback = loadFromLocalStorage();
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";

      setState((prev) => ({
        ...prev,
        categories: prev.categories.length > 0 ? prev.categories : fallback.categories,
        products: prev.products.length > 0 ? prev.products : fallback.products,
        loading: false,
        error: `Erro ao sincronizar (tentativas exauridas): ${errorMsg}`,
        lastSync: new Date(),
      }));

      console.error("[useSyncedData] Erro após múltiplas tentativas:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [saveToLocalStorage, loadFromLocalStorage, broadcastUpdate]);

  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      refresh();
    }, DEBOUNCE_DELAY);
  }, [refresh]);

  useEffect(() => {
    mountedRef.current = true;

    // Carregar dados do Supabase imediatamente (em background se já temos cache)
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

    // Supabase Realtime - escuta mudanças no banco
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

    // PERFORMANCE FIX: Polling a cada 30s (antes era 10s)
    // Realtime cuida das mudanças em tempo real, polling é backup
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
