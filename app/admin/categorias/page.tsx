"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { Category } from "@/lib/validation";

/**
 * Verifica se uma categoria é oculta (sistema)
 * Categorias ocultas têm IDs com formato __nome__
 */
const isHiddenCategory = (categoryId: string): boolean => {
  return categoryId.startsWith("__") && categoryId.endsWith("__");
};

export default function CategoriasPage() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const cardapio = useCardapio();
  const toast = useToast();

  // CRÍTICO: Filtrar apenas para exibição, não para sincronização
  const visibleCategories = cardapio.categories.filter((c) => !isHiddenCategory(c.id));

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    const nameExists = visibleCategories.some(
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
        order: visibleCategories.length,
      };

      await cardapio.addCategory(newCategory);
      setNewCategoryName("");
      toast.success("Categoria criada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    }
  }, [newCategoryName, visibleCategories, cardapio, toast]);

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
      toast.success("Categoria atualizada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria");
    }
  }, [editingCategoryName, cardapio, toast]);

  const handleMoveCategory = useCallback(
    async (categoryId: string, direction: "up" | "down") => {
      const visibleCats = [...visibleCategories];
      const index = visibleCats.findIndex((c) => c.id === categoryId);
      if (index === -1) return;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= visibleCats.length) return;

      [visibleCats[index], visibleCats[targetIndex]] = [visibleCats[targetIndex], visibleCats[index]];

      const hiddenCats = cardapio.categories.filter((c) => isHiddenCategory(c.id));
      const reorderedVisible = visibleCats.map((c, i) => ({ ...c, order: i }));
      const allReordered = [...reorderedVisible, ...hiddenCats];

      try {
        await cardapio.reorderCategories(allReordered);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao reordenar");
      }
    },
    [visibleCategories, cardapio, toast]
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const hasProducts = cardapio.products.some((p) => p.category === categoryId);

      if (hasProducts) {
        toast.error(
          "Mova os produtos para outra categoria antes de deletar esta."
        );
        return;
      }

      if (!confirm("Tem certeza que quer deletar esta categoria?")) return;

      try {
        await cardapio.deleteCategory(categoryId);
        toast.success("Categoria deletada!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao deletar categoria");
      }
    },
    [cardapio, toast]
  );

  return (
    <div className="space-y-5">
      {/* Formulário adicionar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
            }}
            placeholder="Nome da nova categoria..."
            autoComplete="off"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 font-medium text-sm"
          />
          <RippleButton
            onClick={handleAddCategory}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl whitespace-nowrap text-sm flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            <span>Adicionar</span>
          </RippleButton>
        </div>
      </div>

      {/* Lista de categorias */}
      {visibleCategories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <span className="text-5xl block mb-3">📁</span>
          <p className="text-gray-500 font-medium">Nenhuma categoria criada</p>
          <p className="text-gray-400 text-sm mt-1">Crie sua primeira categoria acima</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleCategories.map((category, index) => {
            const productCount = cardapio.products.filter((p) => p.category === category.id).length;

            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                {editingCategoryId === category.id ? (
                  /* Modo edição */
                  <div className="p-4 flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditCategory(category.id);
                        if (e.key === "Escape") setEditingCategoryId(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-semibold text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <RippleButton
                        onClick={() => handleEditCategory(category.id)}
                        className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
                      >
                        Salvar
                      </RippleButton>
                      <RippleButton
                        onClick={() => setEditingCategoryId(null)}
                        className="flex-1 sm:flex-none bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
                      >
                        Cancelar
                      </RippleButton>
                    </div>
                  </div>
                ) : (
                  /* Modo visualização */
                  <div className="p-4 flex items-center gap-3">
                    {/* Setas de reordenação */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMoveCategory(category.id, "up")}
                        disabled={index === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        title="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveCategory(category.id, "down")}
                        disabled={index === visibleCategories.length - 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs"
                        title="Mover para baixo"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Info da categoria */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate text-sm">
                        {category.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {productCount} {productCount === 1 ? "produto" : "produtos"}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-sm"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-sm"
                        title="Deletar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
