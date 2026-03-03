"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { MenuItem } from "@/lib/validation";

// Emojis por categoria
function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("pão") || lower.includes("pao") || lower.includes("paes") || lower.includes("pães")) return "🍞";
  if (lower.includes("bolo") || lower.includes("torta")) return "🎂";
  if (lower.includes("doce") || lower.includes("sobremesa") || lower.includes("confeit")) return "🍰";
  if (lower.includes("salgado") || lower.includes("lanche") || lower.includes("sanduíche") || lower.includes("sanduiche")) return "🥪";
  if (lower.includes("bebida") || lower.includes("suco") || lower.includes("refrigerante")) return "🥤";
  if (lower.includes("café") || lower.includes("cafe")) return "☕";
  if (lower.includes("pizza")) return "🍕";
  if (lower.includes("promoção") || lower.includes("promocao") || lower.includes("destaque") || lower.includes("oferta")) return "⭐";
  return "🍽️";
}

export default function ProdutosPage() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<MenuItem | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragDataRef = useRef<{ product: MenuItem; categoryId: string } | null>(null);

  const router = useRouter();
  const cardapio = useCardapio();
  const toast = useToast();

  const filteredProducts = filterCategory
    ? cardapio.products.filter((p) => p.category === filterCategory)
    : cardapio.products;

  const getCategoryName = (categoryId: string) => {
    return cardapio.categories.find((c) => c.id === categoryId)?.name || "";
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Deletar "${name}"?`)) return;
    try {
      await cardapio.deleteProduct(id);
      toast.success("Produto deletado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar");
    }
  };

  const handleDragStart = (e: React.DragEvent, product: MenuItem, categoryId: string) => {
    setDraggedProduct(product);
    dragDataRef.current = { product, categoryId };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", product.id);
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
    setDragOverCategory(null);
    setDragOverIndex(null);
    dragDataRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Só desativa se sair completamente da zona
    if ((e.target as HTMLElement).classList.contains("products-drop-zone")) {
      setDragOverCategory(null);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    categoryId: string,
    targetIndex: number
  ) => {
    e.preventDefault();

    if (!dragDataRef.current) return;

    const { product: draggedProd, categoryId: sourceCategoryId } = dragDataRef.current;

    // Evitar drop na mesma posição
    if (
      sourceCategoryId === categoryId &&
      cardapio.products.indexOf(draggedProd) === targetIndex
    ) {
      handleDragEnd();
      return;
    }

    try {
      // Obter os produtos da categoria de destino
      const targetCategoryProducts = cardapio.products
        .filter((p) => p.category === categoryId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Se moveu para categoria diferente, adicionar produto à nova categoria
      let updatedProducts = [...cardapio.products];

      if (sourceCategoryId !== categoryId) {
        // Remover da categoria anterior
        updatedProducts = updatedProducts.filter((p) => p.id !== draggedProd.id);

        // Adicionar à nova categoria
        const newProduct = { ...draggedProd, category: categoryId };
        updatedProducts.push(newProduct);
      }

      // Reordenar produtos da categoria de destino
      const destCategoryProducts = updatedProducts
        .filter((p) => p.category === categoryId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const draggedProdInDest = destCategoryProducts.find((p) => p.id === draggedProd.id);
      const draggedProdIndexInDest = destCategoryProducts.indexOf(draggedProdInDest!);

      // Remover do índice anterior
      if (draggedProdIndexInDest !== -1) {
        destCategoryProducts.splice(draggedProdIndexInDest, 1);
      }

      // Inserir no novo índice
      destCategoryProducts.splice(Math.min(targetIndex, destCategoryProducts.length), 0, draggedProdInDest!);

      // Atualizar order de todos os produtos dessa categoria
      const reorderedInCategory = destCategoryProducts.map((p, idx) => ({
        ...p,
        order: idx,
      }));

      // Construir novo array de produtos
      const finalProducts = updatedProducts.map((p) => {
        const reordered = reorderedInCategory.find((rp) => rp.id === p.id);
        return reordered || p;
      });

      // Fazer update otimista
      await cardapio.reorderProducts(finalProducts);
      toast.success("Produto reordenado!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao reordenar");
    }

    handleDragEnd();
  };

  // Agrupar produtos por categoria (para exibição estilo cardápio)
  const categoriesWithProducts = cardapio.categories
    .filter((cat) => {
      if (filterCategory) return cat.id === filterCategory;
      return filteredProducts.some((p) => p.category === cat.id);
    })
    .map((cat) => ({
      ...cat,
      products: filteredProducts
        .filter((p) => p.category === cat.id)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    }))
    .filter((cat) => cat.products.length > 0);

  return (
    <div className="space-y-5">
      {/* Botão novo produto + Filtros */}
      <div className="flex flex-col gap-4">
        {/* Botão novo produto */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/admin/produtos/novo")}
            className="bg-[#7c4e42] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#5a3a2f] transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-sm"
          >
            <span className="text-lg leading-none">+</span>
            <span>Novo Produto</span>
          </button>
        </div>

        {/* Filtro de categorias estilo cardápio */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
          <button
            onClick={() => setFilterCategory(null)}
            className={`category-chip flex-shrink-0 ${
              filterCategory === null ? "category-chip-active" : "category-chip-inactive"
            }`}
          >
            <span className="category-chip-emoji">🏠</span>
            <span>Todos</span>
          </button>
          {cardapio.categories.map((cat) => {
            const emoji = getCategoryEmoji(cat.name);
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`category-chip flex-shrink-0 ${
                  filterCategory === cat.id ? "category-chip-active" : "category-chip-inactive"
                }`}
              >
                <span className="category-chip-emoji">{emoji}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de produtos estilo cardápio */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl block mb-3">📦</span>
          <p className="text-gray-500 font-medium text-sm">
            {filterCategory ? "Nenhum produto nesta categoria" : "Nenhum produto cadastrado"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categoriesWithProducts.map((cat) => (
            <div key={cat.id}>
              {/* Separador de categoria estilo cardápio */}
              {!filterCategory && (
                <div className="category-divider mb-4">
                  <h3>
                    <span>{getCategoryEmoji(cat.name)}</span>
                    {cat.name}
                    <span className="item-count">{cat.products.length}</span>
                  </h3>
                </div>
              )}

              {/* Cards dos produtos */}
              <div className="space-y-3 products-drop-zone"
                   onDragOver={(e) => handleDragOver(e, cat.id)}
                   onDragLeave={handleDragLeave}
              >
                {cat.products.map((product, index) => (
                  <div
                    key={product.id}
                    className={`product-card-container bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all draggable-product ${
                      draggedProduct?.id === product.id ? "dragging" : ""
                    } ${dragOverCategory === cat.id && dragOverIndex === index ? "drag-over-item" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, product, cat.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverCategory(cat.id);
                      setDragOverIndex(index);
                    }}
                    onDrop={(e) => handleDrop(e, cat.id, index)}
                  >
                    <div className="flex">
                      {/* Imagem */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-50">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl opacity-30">🍽️</span>
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-gray-900 text-sm truncate">
                              {product.name}
                            </h4>
                            {!product.available && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                Indisponível
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-extrabold text-[#7c4e42]">
                            R$ {typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
                          </span>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => router.push(`/admin/produtos/editar/${product.id}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#f3ece9] text-[#7c4e42] hover:bg-[#e8ddd8] transition-all text-xs"
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-xs"
                              title="Deletar"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
