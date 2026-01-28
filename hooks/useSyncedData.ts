"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { syncFromSupabase } from "@/lib/api";
import { supabase } from "@/lib/supabase";

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

  // Atualizar localStorage para fallback
  const saveToLocalStorage = useCallback((categories: Category[], products: MenuItem[]) => {
    try {
      localStorage.setItem("cardapio-categories", JSON.stringify(categories));
      localStorage.setItem("cardapio-products", JSON.stringify(products));
    } catch (error) {
      console.error("Erro ao salvar em localStorage:", error);
    }
  }, []);

  // Carregar dados do localStorage como fallback
  const loadFromLocalStorage = useCallback((): { categories: Category[]; products: MenuItem[] } => {
    try {
      const categories = localStorage.getItem("cardapio-categories");
      const products = localStorage.getItem("cardapio-products");

      return {
        categories: categories ? JSON.parse(categories) : [],
        products: products ? JSON.parse(products) : [],
      };
    } catch (error) {
      console.error("Erro ao carregar localStorage:", error);
      return { categories: [], products: [] };
    }
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

  // Função principal para sincronizar
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Tentar carregar do Supabase
      const data = await syncFromSupabase();

      setState({
        categories: data.categories,
        products: data.products,
        loading: false,
        error: null,
        lastSync: new Date(),
      });

      // Salvar em localStorage para fallback
      saveToLocalStorage(data.categories, data.products);

      // Notificar outras abas
      broadcastUpdate(data.categories, data.products);
    } catch (error) {
      // Fallback para localStorage
      const fallback = loadFromLocalStorage();

      setState({
        categories: fallback.categories,
        products: fallback.products,
        loading: false,
        error: `Sincronização offline: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        lastSync: new Date(),
      });

      // Notificar outras abas do fallback
      broadcastUpdate(fallback.categories, fallback.products);
    }
  }, [saveToLocalStorage, loadFromLocalStorage, broadcastUpdate]);

  // Setup de Realtime e BroadcastChannel
  useEffect(() => {
    // Carregar dados iniciais
    refresh();

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
      console.warn("BroadcastChannel não suportado:", error);
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
            console.log("📡 [Realtime] Mudança detectada em categories");
            refresh();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "menu_items" },
          () => {
            console.log("📡 [Realtime] Mudança detectada em menu_items");
            refresh();
          }
        )
        .on("system", { event: "down" }, () => {
          console.warn("❌ [Realtime] Desconectado do servidor");
          setState((prev) => ({ ...prev, realtimeConnected: false }));
        })
        .on("system", { event: "up" }, () => {
          console.log("✅ [Realtime] Conectado ao servidor");
          setState((prev) => ({ ...prev, realtimeConnected: true }));
        })
        .subscribe((status) => {
          console.log("🔗 [Realtime] Status de subscrição:", status);
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
      console.error("❌ [Realtime] Falha ao conectar:", error);
      setState((prev) => ({ ...prev, realtimeConnected: false }));
    }

    // Polling contínuo (a cada 3 segundos) - garante atualização entre aparelhos mesmo sem Realtime
    console.log("📡 [Polling] Iniciando polling contínuo a cada 3 segundos");
    pollIntervalRef.current = setInterval(() => {
      console.log("📡 [Polling] Sincronizando dados...");
      refresh();
    }, 3000);

    // Cleanup
    return () => {
      unsubscribeRef.current?.();
      broadcastChannelRef.current?.close();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
