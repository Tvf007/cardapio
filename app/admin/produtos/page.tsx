"use client";

import { useState } from "react";
import { RippleButton } from "@/components/RippleButton";
import { ProductForm } from "@/components/ProductForm";
import { AdminProductList } from "@/components/AdminProductList";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { MenuItem } from "@/lib/validation";

export default function ProdutosPage() {
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const cardapio = useCardapio();
  const toast = useToast();

  const filteredProducts = filterCategory
    ? cardapio.products.filter((p) => p.category === filterCategory)
    : cardapio.products;

  const handleSaveProduct = async (product: MenuItem) => {
    try {
      if (editingProduct) {
        await cardapio.updateProduct(product);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await cardapio.addProduct(product);
        toast.success("Produto adicionado com sucesso!");
      }
      setEditingProduct(null);
      setShowProductForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que quer deletar este produto?")) return;

    try {
      await cardapio.deleteProduct(id);
      toast.success("Produto deletado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar produto");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Gerenciar Produtos</h2>
        <p className="text-gray-600">Adicione, edite ou remova produtos do seu cardápio</p>
      </div>

      {/* Add Product Form */}
      {showProductForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {editingProduct ? "✏️ Editar Produto" : "✨ Novo Produto"}
          </h3>
          <ProductForm
            onSubmit={handleSaveProduct}
            onCancel={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
            product={editingProduct || undefined}
            categories={cardapio.categories}
          />
        </div>
      )}

      {/* Filters and New Product Button */}
      {!showProductForm && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filterCategory === null
                  ? "bg-[#7c4e42] text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas ({cardapio.products.length})
            </button>
            {cardapio.categories.map((cat) => {
              const count = cardapio.products.filter((p) => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    filterCategory === cat.id
                      ? "bg-[#7c4e42] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* New Product Button */}
          <RippleButton
            onClick={() => {
              setEditingProduct(null);
              setShowProductForm(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap flex-shrink-0 text-sm sm:text-base"
          >
            <span className="text-lg">+</span>
            <span>Novo Produto</span>
          </RippleButton>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-lg mb-2">
              {filterCategory ? "Nenhum produto nesta categoria" : "Nenhum produto cadastrado ainda"}
            </p>
            <p className="text-gray-400 text-sm">
              {filterCategory
                ? "Selecione outra categoria ou adicione um produto"
                : 'Clique em "+ Novo Produto" para começar'}
            </p>
          </div>
        ) : (
          <AdminProductList
            products={filteredProducts}
            categories={cardapio.categories}
            onEdit={(product) => {
              setEditingProduct(product);
              setShowProductForm(true);
            }}
            onDelete={handleDeleteProduct}
            onSave={handleSaveProduct}
          />
        )}
      </div>
    </div>
  );
}
