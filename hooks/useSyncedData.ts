"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { syncFromSupabase } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface BroadcastMessage {
  type: "sync" | "update";
  data?: {
    categories?: Category[];
    products?: MenuItem[];
  };
  timestamp: number;
}

export interface SyncedDataState {
  categories: Category[];
  products: MenuItem[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  realtimeConnected: boolean;
}

const POLL_INTERVAL = 30000;
const DEBOUNCE_DELAY = 1000;

export function useSyncedData(): SyncedDataState & {
  refresh: () => Promise<void>;
  setOptimisticData: (data: { categories?: Category[]; products?: MenuItem[] }) => void;
} {
  // Carregar dados do localStorage para inicialização imediata
  const initialData = typeof window !== "undefined"
    ? (() => {
        try {
          const cat = localStorage.getItem("cardapio-categories");
          const prod = localStorage.getItem("cardapio-products");
          return {
            categories: cat ? JSON.parse(cat) : [],
            products: prod ? JSON.parse(prod) : []
          };
        } catch {
          return { categories: [], products: [] };
        }
      })()
    : { categories: [], products: [] };

  const [state, setState] = useState<SyncedDataState>({
    categories: initialData.categories,
    products: initialData.products,
    loading: true,
    error: null,
    lastSync: null,
    realtimeConnected: false,
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const saveToLocalStorage = useCallback((categories: Category[], products: MenuItem[]) => {
    try {
      localStorage.setItem("cardapio-categories", JSON.stringify(categories));
      localStorage.setItem("cardapio-products", JSON.stringify(products));
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

  const broadcastUpdate = useCallback((categories: Category[], products: MenuItem[]) => {
    try {
      broadcastChannelRef.current?.postMessage({
        type: "sync",
        data: { categories, products },
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

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await syncFromSupabase();

      if (!mountedRef.current) return;

      setState((prev) => ({
        ...prev,
        categories: data.categories,
        products: data.products,
        loading: false,
        error: null,
        lastSync: new Date(),
      }));

      saveToLocalStorage(data.categories, data.products);
      broadcastUpdate(data.categories, data.products);
    } catch (error) {
      if (!mountedRef.current) return;

      const fallback = loadFromLocalStorage();
      setState((prev) => ({
        ...prev,
        categories: fallback.categories.length > 0 ? fallback.categories : prev.categories,
        products: fallback.products.length > 0 ? fallback.products : prev.products,
        loading: false,
        error: `Sincronizacao offline: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        lastSync: new Date(),
      }));
    }
  }, [saveToLocalStorage, loadFromLocalStorage, broadcastUpdate]);

  // Debounced refresh for realtime events
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

    // Initial load
    refresh();

    // BroadcastChannel for cross-tab sync
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
    } catch {
      // BroadcastChannel not supported
    }

    // Supabase Realtime
    const channel = supabase
      .channel("cardapio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => debouncedRefresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setState((prev) => ({ ...prev, realtimeConnected: true }));
        }
      });

    // Polling for device sync
    pollIntervalRef.current = setInterval(refresh, POLL_INTERVAL);

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
