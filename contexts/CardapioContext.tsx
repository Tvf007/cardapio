"use client";

import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { MenuItem, Category } from "@/lib/validation";
import { useSyncedData } from "@/hooks/useSyncedData";
import { syncToSupabase } from "@/lib/api";

interface CardapioContextType {
  // Dados
  categories: Category[];
  products: MenuItem[];
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

export function CardapioProvider({ children }: { children: ReactNode }) {
  const syncedData = useSyncedData();

  const updateProduct = useCallback(
    async (product: MenuItem) => {
      const updatedProducts = syncedData.products.map((p) => (p.id === product.id ? product : p));
      await syncToSupabase(updatedProducts, syncedData.categories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const updatedProducts = syncedData.products.filter((p) => p.id !== id);
      await syncToSupabase(updatedProducts, syncedData.categories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const addProduct = useCallback(
    async (product: MenuItem) => {
      const updatedProducts = [...syncedData.products, product];
      await syncToSupabase(updatedProducts, syncedData.categories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const updateCategory = useCallback(
    async (category: Category) => {
      const updatedCategories = syncedData.categories.map((c) =>
        c.id === category.id ? category : c
      );
      await syncToSupabase(syncedData.products, updatedCategories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const updatedCategories = syncedData.categories.filter((c) => c.id !== id);
      const updatedProducts = syncedData.products.filter((p) => p.category !== id);
      await syncToSupabase(updatedProducts, updatedCategories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const addCategory = useCallback(
    async (category: Category) => {
      const updatedCategories = [...syncedData.categories, category];
      await syncToSupabase(syncedData.products, updatedCategories);
      // Refresh para sincronizar em tempo real
      await syncedData.refresh();
    },
    [syncedData]
  );

  const syncToCloud = useCallback(async () => {
    await syncToSupabase(syncedData.products, syncedData.categories);
    await syncedData.refresh();
  }, [syncedData]);

  return (
    <CardapioContext.Provider
      value={{
        categories: syncedData.categories,
        products: syncedData.products,
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
