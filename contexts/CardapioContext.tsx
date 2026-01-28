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
      try {
        console.log("[CardapioContext] Atualizando produto:", product.id);
        const updatedProducts = syncedData.products.map((p) => (p.id === product.id ? product : p));
        await syncToSupabase(updatedProducts, syncedData.categories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Produto atualizado com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao atualizar produto:", error);
        throw error; // Re-throw para que o componente pai possa tratar
      }
    },
    [syncedData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        console.log("[CardapioContext] Deletando produto:", id);
        const updatedProducts = syncedData.products.filter((p) => p.id !== id);
        await syncToSupabase(updatedProducts, syncedData.categories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Produto deletado com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao deletar produto:", error);
        throw error; // Re-throw para que o componente pai possa tratar
      }
    },
    [syncedData]
  );

  const addProduct = useCallback(
    async (product: MenuItem) => {
      try {
        console.log("[CardapioContext] Adicionando produto:", product.name);
        const updatedProducts = [...syncedData.products, product];
        await syncToSupabase(updatedProducts, syncedData.categories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Produto adicionado com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao adicionar produto:", error);
        throw error; // Re-throw para que o componente pai possa tratar
      }
    },
    [syncedData]
  );

  const updateCategory = useCallback(
    async (category: Category) => {
      try {
        console.log("[CardapioContext] Atualizando categoria:", category.id);
        const updatedCategories = syncedData.categories.map((c) =>
          c.id === category.id ? category : c
        );
        await syncToSupabase(syncedData.products, updatedCategories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Categoria atualizada com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao atualizar categoria:", error);
        throw error;
      }
    },
    [syncedData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        console.log("[CardapioContext] Deletando categoria:", id);
        const updatedCategories = syncedData.categories.filter((c) => c.id !== id);
        const updatedProducts = syncedData.products.filter((p) => p.category !== id);
        await syncToSupabase(updatedProducts, updatedCategories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Categoria deletada com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao deletar categoria:", error);
        throw error;
      }
    },
    [syncedData]
  );

  const addCategory = useCallback(
    async (category: Category) => {
      try {
        console.log("[CardapioContext] Adicionando categoria:", category.name);
        const updatedCategories = [...syncedData.categories, category];
        await syncToSupabase(syncedData.products, updatedCategories);
        // Refresh para sincronizar em tempo real
        await syncedData.refresh();
        console.log("[CardapioContext] Categoria adicionada com sucesso");
      } catch (error) {
        console.error("[CardapioContext] Erro ao adicionar categoria:", error);
        throw error;
      }
    },
    [syncedData]
  );

  const syncToCloud = useCallback(async () => {
    try {
      console.log("[CardapioContext] Sincronizando com nuvem...");
      await syncToSupabase(syncedData.products, syncedData.categories);
      await syncedData.refresh();
      console.log("[CardapioContext] Sincronizacao concluida");
    } catch (error) {
      console.error("[CardapioContext] Erro na sincronizacao:", error);
      throw error;
    }
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
