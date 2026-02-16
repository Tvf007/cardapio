"use client";

import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { Category } from "@/lib/validation";

const isHiddenCategory = (categoryId: string): boolean => {
  return categoryId.startsWith("__") && categoryId.endsWith("__");
};

export default function CategoriasPage() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const cardapio = useCardapio();
  const toast = useToast();

  const visibleCategories = cardapio.categories.filter((c) => !isHiddenCategory(c.id));

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) { toast.error("Digite o nome da categoria"); return; }

    const nameExists = visibleCategories.some(
      (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (nameExists) { toast.error("Categoria já existe!"); return; }

    try {
      const newCategory: Category = { id: uuid(), name: newCategoryName.trim(), order: visibleCategories.length };
      await cardapio.addCategory(newCategory);
      setNewCategoryName("");
      toast.success("Categoria criada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar");
    }
  }, [newCategoryName, visibleCategories, cardapio, toast]);

  const handleEditCategory = useCallback(async (categoryId: string) => {
    if (!editingCategoryName.trim()) { toast.error("Digite o nome"); return; }

    try {
      const existingCat = cardapio.categories.find((c) => c.id === categoryId);
      const updatedCategory: Category = { id: categoryId, name: editingCategoryName.trim(), order: existingCat?.order ?? 0 };
      await cardapio.updateCategory(updatedCategory);
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Categoria atualizada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
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
      if (hasProducts) { toast.error("Mova os produtos antes de deletar esta categoria."); return; }
      if (!confirm("Deletar esta categoria?")) return;

      try {
        await cardapio.deleteCategory(categoryId);
        toast.success("Categoria deletada!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao deletar");
      }
    },
    [cardapio, toast]
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Formulário adicionar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
            placeholder="Nova categoria..."
            autoComplete="off"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 font-medium text-sm"
          />
          <button
            onClick={handleAddCategory}
            className="bg-[#7c4e42] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#5a3a2f] transition-all shadow-md text-sm flex-shrink-0"
          >
            + Criar
          </button>
        </div>
      </div>

      {/* Lista */}
      {visibleCategories.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-3">📁</span>
          <p className="text-gray-500 font-medium text-sm">Nenhuma categoria criada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleCategories.map((category, index) => {
            const productCount = cardapio.products.filter((p) => p.category === category.id).length;

            return (
              <div key={category.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {editingCategoryId === category.id ? (
                  <div className="p-4 flex gap-3">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditCategory(category.id);
                        if (e.key === "Escape") setEditingCategoryId(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-[#d4a574] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] bg-white text-gray-900 font-semibold text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditCategory(category.id)}
                      className="bg-[#7c4e42] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5a3a2f] transition-all"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditingCategoryId(null)}
                      className="text-gray-500 text-sm font-medium px-3 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-3">
                    {/* Setas */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleMoveCategory(category.id, "up")}
                        disabled={index === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#7c4e42] hover:bg-[#f3ece9] disabled:opacity-15 disabled:cursor-not-allowed transition-all text-xs"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveCategory(category.id, "down")}
                        disabled={index === visibleCategories.length - 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#7c4e42] hover:bg-[#f3ece9] disabled:opacity-15 disabled:cursor-not-allowed transition-all text-xs"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{category.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{productCount} {productCount === 1 ? "produto" : "produtos"}</p>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#f3ece9] text-[#7c4e42] hover:bg-[#e8ddd8] transition-all text-sm"
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
