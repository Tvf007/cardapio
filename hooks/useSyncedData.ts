"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { syncFromSupabase } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Helper function to create a debounced refresh
const createDebouncedRefresh = (fn: () => Promise<void>, delayMs: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let isScheduled = false;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!isScheduled) {
      isScheduled = true;
      timeoutId = setTimeout(async () => {
        await fn();
        isScheduled = false;
      }, delayMs);
    }
  };
};

export interface SyncedDataState {
  categories: Category[];
  products: MenuItem[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  realtimeConnected: boolean;
}

// Tipo para mensagens do BroadcastChannel
interface BroadcastMessage {
  type: "sync" | "update";
  data?: {
    categories?: Category[];
    products?: MenuItem[];
  };
  timestamp: number;
}

export function useSyncedData(): SyncedDataState & {
  refresh: () => Promise<void>;
  setOptimisticData: (data: { categories?: Category[]; products?: MenuItem[] }) => void;
} {
  const [state, setState] = useState<SyncedDataState>({
    categories: [],
    products: [],
    loading: true,
    error: null,
    lastSync: null,
    realtimeConnected: false,
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Atualizar localStorage para fallback
  const saveToLocalStorage = useCallback((categories: Category[], products: MenuItem[]) => {
    try {
      localStorage.setItem("cardapio-categories", JSON.stringify(categories));
      localStorage.setItem("cardapio-products", JSON.stringify(products));
    } catch (error) {
      // Error saving to localStorage - continue without it
    }
  }, []);

  // Carregar dados do localStorage como fallback
  const loadFromLocalStorage = useCallback((): { categories: Category[]; products: MenuItem[] } => {
    const result = { categories: [] as Category[], products: [] as MenuItem[] };

    try {
      const categoriesStr = localStorage.getItem("cardapio-categories");
      if (categoriesStr) {
        try {
          result.categories = JSON.parse(categoriesStr);
        } catch {
          localStorage.removeItem("cardapio-categories");
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }

    try {
      const productsStr = localStorage.getItem("cardapio-products");
      if (productsStr) {
        try {
          result.products = JSON.parse(productsStr);
        } catch {
          localStorage.removeItem("cardapio-products");
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }

    return result;
  }, []);

  // Broadcast para outras abas
  const broadcastUpdate = useCallback((categories: Category[], products: MenuItem[]) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "sync",
        data: { categories, products },
        timestamp: Date.now(),
      } as BroadcastMessage);
    }
  }, []);

  // Funcao para atualizar dados otimisticamente (sem loading)
  const setOptimisticData = useCallback((data: { categories?: Category[]; products?: MenuItem[] }) => {
    setState((prev) => ({
      ...prev,
      categories: data.categories !== undefined ? data.categories : prev.categories,
      products: data.products !== undefined ? data.products : prev.products,
    }));
  }, []);

  // Funcao principal para sincronizar
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const cached = loadFromLocalStorage();

      // Tentar carregar do Supabase
      const data = await syncFromSupabase();

      setState((prev) => ({
        ...prev,
        categories: data.categories,
        products: data.products,
        loading: false,
        error: null,
        lastSync: new Date(),
      }));

      // Salvar em localStorage para fallback
      saveToLocalStorage(data.categories, data.products);

      // Notificar outras abas
      broadcastUpdate(data.categories, data.products);
    } catch (error) {
      // Fallback para localStorage
      const fallback = loadFromLocalStorage();

      setState((prev) => ({
        ...prev,
        categories: fallback.categories,
        products: fallback.products,
        loading: false,
        error: `Sincronizacao offline: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        lastSync: new Date(),
      }));

      // Notificar outras abas do fallback
      broadcastUpdate(fallback.categories, fallback.products);
    }
  }, [saveToLocalStorage, loadFromLocalStorage, broadcastUpdate]);

  // Setup de Realtime e BroadcastChannel
  useEffect(() => {
    // Usar flag para evitar múltiplas inicializações
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Carregar dados iniciais
    refresh();

    // Debounced refresh para realtime listeners (evita múltiplas sincronizações simultâneas)
    const debouncedRefresh = createDebouncedRefresh(refresh, 2000);

    // Setup BroadcastChannel para sincronizar entre abas
    try {
      broadcastChannelRef.current = new BroadcastChannel("cardapio-sync");
      broadcastChannelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        if (event.data.type === "sync" && event.data.data) {
          const { categories, products } = event.data.data;
          setState((prev) => ({
            ...prev,
            categories: categories || prev.categories,
            products: products || prev.products,
          }));
        }
      };
    } catch (error) {
      // BroadcastChannel not supported - continue without cross-tab sync
    }

    // Setup de Realtime do Supabase
    let channel: any = null;
    try {
      channel = supabase
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
            debouncedRefresh();
          }
        )
        .on("system", { event: "down" }, () => {
          setState((prev) => ({ ...prev, realtimeConnected: false }));
        })
        .on("system", { event: "up" }, () => {
          setState((prev) => ({ ...prev, realtimeConnected: true }));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setState((prev) => ({ ...prev, realtimeConnected: true }));
          }
        });

      unsubscribeRef.current = () => {
        if (channel) {
          channel.unsubscribe();
        }
      };
    } catch (error) {
      setState((prev) => ({ ...prev, realtimeConnected: false }));
    }

    // Polling contínuo (a cada 60 segundos) - garante atualização entre aparelhos mesmo sem Realtime
    pollIntervalRef.current = setInterval(() => {
      refresh();
    }, 60000);

    // Cleanup
    return () => {
      unsubscribeRef.current?.();
      broadcastChannelRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    setOptimisticData,
  };
}
