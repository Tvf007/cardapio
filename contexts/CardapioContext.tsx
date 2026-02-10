"use client";

import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { useSyncedData } from "@/hooks/useSyncedData";
import { syncToSupabase } from "@/lib/api";

interface CardapioContextType {
  // Dados
  categories: Category[];
  products: MenuItem[];
  logo: string | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;

  // Ações
  refresh: () => Promise<void>;
  updateProduct: (product: MenuItem) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addProduct: (product: MenuItem) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const CardapioContext = createContext<CardapioContextType | undefined>(undefined);

// Helper function para filtrar categorias inválidas
const getValidCategories = (categories: Category[]): Category[] => {
  return categories.filter((c) => c && c.id && c.id !== null && c.id !== undefined);
};

export function CardapioProvider({ children }: { children: ReactNode }) {
  const syncedData = useSyncedData();

  const updateProduct = useCallback(
    async (product: MenuItem) => {
      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousProducts = syncedData.products;
      const optimisticProducts = previousProducts.map((p) => (p.id === product.id ? product : p));
      syncedData.setOptimisticData({ products: optimisticProducts });

      try {
        const validCats = getValidCategories(syncedData.categories);
        await syncToSupabase(optimisticProducts, validCats);

        // IMPORTANTE: Forçar refresh imediato para sincronização entre dispositivos
        setTimeout(() => {
          syncedData.refresh();
        }, 500);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({ products: previousProducts });
        throw error;
      }
    },
    [syncedData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousProducts = syncedData.products;
      const optimisticProducts = previousProducts.filter((p) => p.id !== id);
      syncedData.setOptimisticData({ products: optimisticProducts });

      try {
        const validCats = getValidCategories(syncedData.categories);
        await syncToSupabase(optimisticProducts, validCats);

        // IMPORTANTE: Forçar refresh imediato para sincronização entre dispositivos
        setTimeout(() => {
          syncedData.refresh();
        }, 500);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({ products: previousProducts });
        throw error;
      }
    },
    [syncedData]
  );

  const addProduct = useCallback(
    async (product: MenuItem) => {
      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousProducts = syncedData.products;
      const optimisticProducts = [...previousProducts, product];
      syncedData.setOptimisticData({ products: optimisticProducts });

      try {
        const validCats = getValidCategories(syncedData.categories);
        await syncToSupabase(optimisticProducts, validCats);

        // IMPORTANTE: Forçar refresh imediato para sincronização entre dispositivos
        // Sem isso, outros dispositivos precisam aguardar o polling (10s)
        setTimeout(() => {
          syncedData.refresh();
        }, 500);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({ products: previousProducts });

        // Melhorar mensagem de erro
        const errorMsg = error instanceof Error ? error.message : "Erro ao sincronizar";
        if (errorMsg.includes("muito grande") || errorMsg.includes("700KB") || errorMsg.includes("500KB")) {
          throw new Error("Imagem muito grande para sincronizar. Tente comprimir a imagem ou reduzir sua qualidade.");
        }
        throw error;
      }
    },
    [syncedData]
  );

  const updateCategory = useCallback(
    async (category: Category) => {
      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousCategories = syncedData.categories;
      const validCats = getValidCategories(previousCategories);
      const optimisticCategories = validCats.map((c) =>
        c.id === category.id ? category : c
      );
      syncedData.setOptimisticData({ categories: optimisticCategories });

      try {
        await syncToSupabase(syncedData.products, optimisticCategories);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({ categories: previousCategories });
        throw error;
      }
    },
    [syncedData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousCategories = syncedData.categories;
      const previousProducts = syncedData.products;
      const validCats = getValidCategories(previousCategories);
      const optimisticCategories = validCats.filter((c) => c.id !== id);
      const optimisticProducts = previousProducts.filter((p) => p.category !== id);
      syncedData.setOptimisticData({
        categories: optimisticCategories,
        products: optimisticProducts
      });

      try {
        await syncToSupabase(optimisticProducts, optimisticCategories);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({
          categories: previousCategories,
          products: previousProducts
        });
        throw error;
      }
    },
    [syncedData]
  );

  const addCategory = useCallback(
    async (category: Category) => {
      // Validar que a categoria tem ID válido
      if (!category.id || category.id === null || category.id === undefined) {
        throw new Error("Categoria deve ter um ID válido");
      }

      // OPTIMISTIC UPDATE: Atualizar UI imediatamente
      const previousCategories = syncedData.categories;
      const validCurrentCategories = getValidCategories(previousCategories);
      const optimisticCategories = [...validCurrentCategories, category];
      syncedData.setOptimisticData({ categories: optimisticCategories });

      try {
        // Sincronizar com Supabase em background
        await syncToSupabase(syncedData.products, optimisticCategories);
      } catch (error) {
        // REVERT: Restaurar estado anterior em caso de erro
        syncedData.setOptimisticData({ categories: previousCategories });
        throw error;
      }
    },
    [syncedData]
  );

  const syncToCloud = useCallback(async () => {
    try {
      const validCats = getValidCategories(syncedData.categories);

      // CRITICAL FIX: Incluir logo na sincronização para evitar deleção silenciosa
      // A logo é armazenada como item especial __site_logo__ e precisa ser incluída em todo sync
      let productsToSync = syncedData.products;
      if (syncedData.logo) {
        const logoItem = {
          id: "__site_logo__",
          name: "Logo",
          category: "__hidden__",
          image: syncedData.logo,
          available: false,
          price: 0,
          description: ""
        };

        // Verificar se logo já está na lista (por segurança)
        const hasLogo = productsToSync.some(p => p.id === "__site_logo__");
        if (!hasLogo) {
          productsToSync = [...productsToSync, logoItem];
        }
      }

      await syncToSupabase(productsToSync, validCats);
    } catch (error) {
      throw error;
    }
  }, [syncedData]);

  return (
    <CardapioContext.Provider
      value={{
        categories: syncedData.categories,
        products: syncedData.products,
        logo: syncedData.logo,
        loading: syncedData.loading,
        error: syncedData.error,
        lastSync: syncedData.lastSync,
        refresh: syncedData.refresh,
        updateProduct,
        deleteProduct,
        addProduct,
        updateCategory,
        deleteCategory,
        addCategory,
        syncToCloud,
      }}
    >
      {children}
    </CardapioContext.Provider>
  );
}

// Hook para usar o context
export function useCardapio(): CardapioContextType {
  const context = useContext(CardapioContext);
  if (context === undefined) {
    throw new Error("useCardapio deve ser usado dentro de CardapioProvider");
  }
  return context;
}
