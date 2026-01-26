"use client";

import { useState, useEffect, useRef } from "react";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductForm } from "@/components/ProductForm";
import { AdminProductList } from "@/components/AdminProductList";
import { RippleButton } from "@/components/RippleButton";
import { MenuItem, Category } from "@/types";

const ADMIN_PASSWORD = "caixa123"; // Altere essa senha!

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Tentar carregar do localStorage primeiro
        const savedProducts = localStorage.getItem("cardapio-products");
        const savedCategories = localStorage.getItem("cardapio-categories");

        if (savedProducts && savedCategories) {
          setProducts(JSON.parse(savedProducts));
          setCategories(JSON.parse(savedCategories));
        } else {
          // Se não houver dados salvos, carregar do arquivo padrão
          const response = await fetch("/api/menu");
          const data = await response.json();
          setProducts(data.products);
          setCategories(data.categories);
          // Salvar para futuras edições
          localStorage.setItem("cardapio-products", JSON.stringify(data.products));
          localStorage.setItem("cardapio-categories", JSON.stringify(data.categories));
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    loadData();

    // Carregar logo do localStorage
    const savedLogo = localStorage.getItem("padaria-logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogo(result);
        localStorage.setItem("padaria-logo", result);
        alert("Logo atualizado com sucesso!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Senha incorreta!");
    }
  };

  const handleSaveProduct = async (product: MenuItem) => {
    const updatedProducts = editingProduct
      ? products.map((p) => (p.id === product.id ? product : p))
      : [...products, product];

    try {
      // Salvar no localStorage
      localStorage.setItem("cardapio-products", JSON.stringify(updatedProducts));

      setProducts(updatedProducts);
      setEditingProduct(null);
      setShowForm(false);
      alert("Produto salvo com sucesso!");
    } catch (error) {
      alert("Erro ao salvar produto");
      console.error(error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que quer deletar?")) return;

    const updatedProducts = products.filter((p) => p.id !== id);

    try {
      // Salvar no localStorage
      localStorage.setItem("cardapio-products", JSON.stringify(updatedProducts));

      setProducts(updatedProducts);
      alert("Produto deletado com sucesso!");
    } catch (error) {
      alert("Erro ao deletar produto");
      console.error(error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Digite o nome da categoria");
      return;
    }

    const newCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
    };

    const updatedCategories = [...categories, newCategory];

    try {
      // Salvar no localStorage
      localStorage.setItem("cardapio-categories", JSON.stringify(updatedCategories));

      setCategories(updatedCategories);
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      alert("Categoria criada com sucesso!");
    } catch (error) {
      alert("Erro ao criar categoria");
      console.error(error);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      alert("Digite o nome da categoria");
      return;
    }

    const updatedCategories = categories.map((cat) =>
      cat.id === categoryId ? { ...cat, name: editingCategoryName.trim() } : cat
    );

    try {
      // Salvar no localStorage
      localStorage.setItem("cardapio-categories", JSON.stringify(updatedCategories));

      setCategories(updatedCategories);
      setEditingCategoryId(null);
      setEditingCategoryName("");
      alert("Categoria atualizada com sucesso!");
    } catch (error) {
      alert("Erro ao atualizar categoria");
      console.error(error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const hasProducts = products.some((p) => p.category === categoryId);

    if (hasProducts) {
      alert("Não é possível deletar uma categoria que possui produtos. Mova os produtos para outra categoria primeiro.");
      return;
    }

    if (!confirm("Tem certeza que quer deletar esta categoria?")) return;

    const updatedCategories = categories.filter((cat) => cat.id !== categoryId);

    try {
      // Salvar no localStorage
      localStorage.setItem("cardapio-categories", JSON.stringify(updatedCategories));

      setCategories(updatedCategories);
      alert("Categoria deletada com sucesso!");
    } catch (error) {
      alert("Erro ao deletar categoria");
      console.error(error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEditingProduct(null);
    setShowForm(false);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const cardapioUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="relative w-12 h-12 rounded-lg flex items-center justify-center hover:opacity-80 transition-all duration-200 shadow-md hover:shadow-lg group cursor-pointer"
              style={{ backgroundColor: '#7c4e42' }}
              title="Clique para alterar logo"
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-xl">🍽️</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200">
                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold">↻</span>
              </span>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              aria-label="Upload logo"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel de Controle</h1>
              <p className="text-xs text-gray-600">Gerenciador de Cardápio</p>
            </div>
          </div>
          <RippleButton
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Sair
          </RippleButton>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Share Link Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-8 mb-12 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Compartilhe o Cardápio</h2>
          <p className="text-gray-700 mb-6">Copie o link abaixo e compartilhe com seus clientes:</p>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={cardapioUrl}
              readOnly
              className="flex-1 px-4 py-3 border border-blue-300 rounded-lg bg-white font-mono text-sm"
            />
            <RippleButton
              onClick={() => {
                navigator.clipboard.writeText(cardapioUrl);
                alert("Link copiado com sucesso!");
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              📋 Copiar
            </RippleButton>
          </div>
          <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 Dica: Use um gerador de QR Code online com este link para criar um QR Code e compartilhe com seus clientes!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Produtos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{products.length}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">
                🍽️
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Categorias</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{categories.length}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📂
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Disponíveis</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {products.filter((p) => p.available).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
            </div>
          </div>
        </div>

        {/* Categories Management */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Categorias</h2>
              <p className="text-gray-600 text-sm mt-1">Gerencie as categorias dos seus produtos</p>
            </div>
            {!showNewCategoryForm && (
              <RippleButton
                onClick={() => setShowNewCategoryForm(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span>➕</span> Nova Categoria
              </RippleButton>
            )}
          </div>

          {/* New Category Form */}
          {showNewCategoryForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da nova categoria"
                  className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-gray-900 placeholder-gray-500"
                  onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
                />
                <RippleButton
                  onClick={handleAddCategory}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  Adicionar
                </RippleButton>
                <RippleButton
                  onClick={() => {
                    setShowNewCategoryForm(false);
                    setNewCategoryName("");
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  Cancelar
                </RippleButton>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RippleButton
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                selectedCategory === null
                  ? "bg-gray-900 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas ({products.length})
            </RippleButton>
            {categories.map((cat) => (
              <div key={cat.id} className="relative">
                {editingCategoryId === cat.id ? (
                  <div className="flex gap-2 items-center bg-white border-2 border-blue-500 rounded-lg p-2">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      autoFocus
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none"
                      onKeyPress={(e) => e.key === "Enter" && handleEditCategory(cat.id)}
                    />
                    <RippleButton
                      onClick={() => handleEditCategory(cat.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      ✓
                    </RippleButton>
                    <RippleButton
                      onClick={() => setEditingCategoryId(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      ✕
                    </RippleButton>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg transition-all group">
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex-1 text-left font-medium text-sm ${
                        selectedCategory === cat.id
                          ? "text-gray-900 font-bold"
                          : "text-gray-700"
                      }`}
                    >
                      {cat.name} ({products.filter((p) => p.category === cat.id).length})
                    </button>
                    <div className="flex gap-2 transition-opacity">
                      <RippleButton
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setEditingCategoryName(cat.name);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        title="Editar categoria"
                      >
                        ✏️ Editar
                      </RippleButton>
                      <RippleButton
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        title="Deletar categoria"
                      >
                        🗑️ Deletar
                      </RippleButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Product Button */}
        {!showForm && (
          <RippleButton
            onClick={() => setShowForm(true)}
            className="mb-8 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span>➕</span> Novo Produto
          </RippleButton>
        )}

        {/* Product Form */}
        {showForm && (
          <ProductForm
            product={editingProduct || undefined}
            categories={categories}
            onSubmit={handleSaveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
          />
        )}

        {/* Products List */}
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Produtos</h2>
            <p className="text-gray-600 text-sm mt-1">
              {selectedCategory
                ? `Produtos de ${categories.find((c) => c.id === selectedCategory)?.name}`
                : "Todos os produtos"}
            </p>
          </div>
          {(() => {
            const filteredProducts = selectedCategory
              ? products.filter((p) => p.category === selectedCategory)
              : products;

            return filteredProducts.length > 0 ? (
              <AdminProductList
                products={filteredProducts}
                categories={categories}
                onEdit={(product) => {
                  setEditingProduct(product);
                  setShowForm(true);
                }}
                onDelete={handleDeleteProduct}
              />
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <p className="text-3xl mb-2">📝</p>
                <p className="text-gray-600 text-lg">
                  {selectedCategory
                    ? "Nenhum produto nesta categoria"
                    : "Nenhum produto adicionado ainda"}
                </p>
                <p className="text-gray-500 text-sm mt-2">Clique no botão acima para criar seu primeiro produto</p>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
