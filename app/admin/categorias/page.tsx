"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { Category } from "@/lib/validation";

export default function CategoriasPage() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const cardapio = useCardapio();
  const toast = useToast();

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    const nameExists = cardapio.categories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (nameExists) {
      toast.error("Categoria com este nome já existe!");
      return;
    }

    try {
      const newCategory: Category = {
        id: uuid(),
        name: newCategoryName.trim(),
        order: cardapio.categories.length,
      };

      await cardapio.addCategory(newCategory);
      setNewCategoryName("");
      toast.success("Categoria criada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    }
  }, [newCategoryName, cardapio, toast]);

  const handleEditCategory = useCallback(async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    try {
      const existingCat = cardapio.categories.find((c) => c.id === categoryId);
      const updatedCategory: Category = {
        id: categoryId,
        name: editingCategoryName.trim(),
        order: existingCat?.order ?? 0,
      };

      await cardapio.updateCategory(updatedCategory);
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Categoria atualizada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria");
    }
  }, [editingCategoryName, cardapio, toast]);

  const handleMoveCategory = useCallback(
    async (categoryId: string, direction: "up" | "down") => {
      const cats = [...cardapio.categories];
      const index = cats.findIndex((c) => c.id === categoryId);
      if (index === -1) return;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= cats.length) return;

      // Trocar posições
      [cats[index], cats[targetIndex]] = [cats[targetIndex], cats[index]];

      // Atribuir order e salvar
      const reordered = cats.map((c, i) => ({ ...c, order: i }));
      try {
        await cardapio.reorderCategories(reordered);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao reordenar");
      }
    },
    [cardapio, toast]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const hasProducts = cardapio.products.some((p) => p.category === categoryId);

      if (hasProducts) {
        toast.error(
          "Não é possível deletar uma categoria que possui produtos. Mova os produtos para outra categoria primeiro."
        );
        return;
      }

      if (!confirm("Tem certeza que quer deletar esta categoria?")) return;

      try {
        await cardapio.deleteCategory(categoryId);
        toast.success("Categoria deletada com sucesso!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao deletar categoria");
      }
    },
    [cardapio, toast]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Categorias</h2>
        <p className="text-gray-600">Organize seus produtos em categorias para melhor navegação</p>
      </div>

      {/* Add Category Form */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">✨ Adicionar Nova Categoria</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddCategory();
              }
            }}
            placeholder="Digite o nome da categoria..."
            autoComplete="off"
            className="flex-1 px-4 py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 font-medium transition-all text-sm"
          />
          <RippleButton
            onClick={handleAddCategory}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap text-sm sm:text-base"
          >
            + Adicionar
          </RippleButton>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="font-bold text-gray-900">
            Categorias ({cardapio.categories.length})
          </h3>
        </div>

        {cardapio.categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Nenhuma categoria criada ainda</p>
            <p className="text-gray-400 text-sm">
              Crie sua primeira categoria acima para organizar seus produtos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {cardapio.categories.map((category, index) => (
              <div
                key={category.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                {editingCategoryId === category.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-semibold text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <RippleButton
                        onClick={() => handleEditCategory(category.id)}
                        className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                      >
                        ✓ Salvar
                      </RippleButton>
                      <RippleButton
                        onClick={() => setEditingCategoryId(null)}
                        className="flex-1 sm:flex-none bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
                      >
                        ✕ Cancelar
                      </RippleButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Ordem e número */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveCategory(category.id, "up")}
                          disabled={index === 0}
                          className="w-8 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveCategory(category.id, "down")}
                          disabled={index === cardapio.categories.length - 1}
                          className="w-8 h-6 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="text-sm font-bold text-gray-400 w-6 text-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {category.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {cardapio.products.filter((p) => p.category === category.id).length} produtos
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <RippleButton
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                        className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-200 transition-all"
                      >
                        ✏️ Editar
                      </RippleButton>
                      <RippleButton
                        onClick={() => handleDeleteCategory(category.id)}
                        className="bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-200 transition-all"
                      >
                        🗑️ Deletar
                      </RippleButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
