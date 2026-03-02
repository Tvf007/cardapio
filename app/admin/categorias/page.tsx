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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCategoryName, visibleCategories, cardapio]);

  const handleEditCategory = useCallback(async (categoryId: string) => {
    if (!editingCategoryName.trim()) { toast.error("Digite o nome"); return; }

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
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCategoryName, cardapio]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCategories, cardapio]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardapio]
  );

  const inputClass =
    "w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#7c4e42] bg-white text-gray-900 text-base font-medium transition-colors placeholder:text-gray-400";

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ── FORMULÁRIO NOVA CATEGORIA ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest mb-4">
          📁 Nova Categoria
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
              placeholder="Ex: Salgados, Doces, Bebidas..."
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <button
            onClick={handleAddCategory}
            className="w-full bg-[#7c4e42] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#5a3a2f] active:scale-[0.98] transition-all shadow-md shadow-[#7c4e42]/25"
          >
            ✓ Criar Categoria
          </button>
        </div>
      </div>

      {/* ── LISTA DE CATEGORIAS ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest">
            📋 Categorias Cadastradas
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {visibleCategories.length}{" "}
            {visibleCategories.length === 1 ? "categoria" : "categorias"} · arraste ▲▼ para reordenar
          </p>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <span className="text-5xl block mb-3">📁</span>
            <p className="font-medium text-base">Nenhuma categoria criada ainda.</p>
            <p className="text-sm mt-1">Use o formulário acima para começar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleCategories.map((category, index) => {
              const productCount = cardapio.products.filter((p) => p.category === category.id).length;

              return (
                <li key={category.id} className="px-5 py-4">
                  {editingCategoryId === category.id ? (
                    /* ── Modo edição ── */
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditCategory(category.id);
                          if (e.key === "Escape") setEditingCategoryId(null);
                        }}
                        className={inputClass}
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="flex-1 bg-[#7c4e42] text-white py-3.5 rounded-2xl font-bold text-base hover:bg-[#5a3a2f] transition-all"
                        >
                          ✓ Salvar
                        </button>
                        <button
                          onClick={() => setEditingCategoryId(null)}
                          className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-semibold text-base hover:bg-gray-200 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Visualização normal ── */
                    <div className="flex items-center gap-4">

                      {/* Setas de reordenação */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleMoveCategory(category.id, "up")}
                          disabled={index === 0}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-[#f3ece9] hover:text-[#7c4e42] disabled:opacity-20 disabled:cursor-not-allowed transition-all font-bold"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveCategory(category.id, "down")}
                          disabled={index === visibleCategories.length - 1}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-[#f3ece9] hover:text-[#7c4e42] disabled:opacity-20 disabled:cursor-not-allowed transition-all font-bold"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Número de ordem */}
                      <div className="w-8 h-8 rounded-full bg-[#f3ece9] text-[#7c4e42] flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Nome e contagem */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-lg leading-tight truncate">
                          {category.name}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {productCount}{" "}
                          {productCount === 1 ? "produto" : "produtos"}
                        </p>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all text-xl"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 transition-all text-xl"
                          title="Deletar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
