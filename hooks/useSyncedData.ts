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

const POLL_INTERVAL = 10000; // Reduzido de 30s para 10s para sincronização mais rápida
const DEBOUNCE_DELAY = 500; // Reduzido de 1s para 500ms para resposta mais rápida

export function useSyncedData(): SyncedDataState & {
  refresh: () => Promise<void>;
  setOptimisticData: (data: { categories?: Category[]; products?: MenuItem[] }) => void;
} {
  // Iniciar VAZIO - sem cache do localStorage para evitar flash de dados desatualizados
  const [state, setState] = useState<SyncedDataState>({
    categories: [],
    products: [],
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

  const refresh = useCallback(async (retryCount = 0, maxRetries = 2) => {
    if (!mountedRef.current) return;

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

      // Retry automático com backoff exponencial
      if (retryCount < maxRetries) {
        const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
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

    // Carregar dados do Supabase imediatamente
    refresh();

    // BroadcastChannel para sync entre abas DO MESMO DISPOSITIVO
    // Nota: BroadcastChannel não funciona entre dispositivos diferentes
    // Dependemos de Realtime + Polling para sincronização entre devices
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
      // BroadcastChannel not supported - não crítico pois temos Realtime
    }

    // Supabase Realtime - Agressivo para sincronização entre dispositivos
    const channel = supabase
      .channel("cardapio-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          // Sincronização imediata para mudanças de categoria
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          // Sincronização imediata para mudanças de produtos (com pequeno debounce)
          debouncedRefresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setState((prev) => ({ ...prev, realtimeConnected: true }));
          console.info("[useSyncedData] Realtime conectado com sucesso");
        }
      });

    // Polling a cada 30s
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
