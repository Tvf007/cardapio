"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuid } from "uuid";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductForm } from "@/components/ProductForm";
import { AdminProductList } from "@/components/AdminProductList";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { loginWithPassword, logout, getCurrentUser, AuthUser } from "@/lib/auth";
import { MenuItem, Category } from "@/lib/validation";

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "categorias" | "produtos">("dashboard");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const cardapio = useCardapio();

  const logo = cardapio.logo; // Logo agora vem do contexto sincronizado!

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    loadUser();
  }, []);

  const handleLogin = async (_email: string, password: string) => {
    try {
      setLoading(true);
      const result = await loginWithPassword(password);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.user) {
        setUser(result.user);
        toast.success("Login realizado com sucesso!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setEditingProduct(null);
      setShowProductForm(false);
      toast.success("Logout realizado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer logout");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setLogo(result);
        localStorage.setItem("padaria-logo", result);

        // Salvar no servidor para sincronizar com outros dispositivos
        try {
          await fetch("/api/logo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logo: result }),
          });
          toast.success("Logo atualizado com sucesso!");
        } catch {
          toast.success("Logo salvo localmente (erro ao sincronizar)");
        }
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleAddCategory = async () => {
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
      };

      await cardapio.addCategory(newCategory);
      setNewCategoryName("");
      toast.success("Categoria criada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    try {
      const updatedCategory: Category = {
        id: categoryId,
        name: editingCategoryName.trim(),
      };

      await cardapio.updateCategory(updatedCategory);
      setEditingCategoryId(null);
      setEditingCategoryName("");
      toast.success("Categoria atualizada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar categoria");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={handleLogin} isLoading={loading} />;
  }

  const cardapioUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center hover:opacity-80 transition-all duration-200 shadow-md hover:shadow-lg group cursor-pointer flex-shrink-0"
                style={{ backgroundColor: "#7c4e42" }}
                title="Clique para alterar logo"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">🍽️</span>
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
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Gerenciador do Cardápio Freitas</h1>
                <p className="text-sm text-gray-600 truncate">
                  Painel Admin - <span className="font-semibold">{user.email}</span>
                </p>
              </div>
            </div>
            <RippleButton
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              Sair
            </RippleButton>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-6">
        <div className="flex gap-0 sm:gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-2.5 sm:px-6 py-3 font-medium text-xs sm:text-base transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
              activeTab === "dashboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="text-base sm:text-lg">📊</span>
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("categorias")}
            className={`px-2.5 sm:px-6 py-3 font-medium text-xs sm:text-base transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
              activeTab === "categorias"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="text-base sm:text-lg">📂</span>
            <span>Categorias</span>
          </button>
          <button
            onClick={() => setActiveTab("produtos")}
            className={`px-2.5 sm:px-6 py-3 font-medium text-xs sm:text-base transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
              activeTab === "produtos"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="text-base sm:text-lg">🍽️</span>
            <span>Produtos</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Share Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-4 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">📋 Compartilhe o Cardápio</h2>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">Copie o link abaixo e compartilhe com seus clientes:</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                <input
                  type="text"
                  value={cardapioUrl}
                  readOnly
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-blue-300 rounded-lg bg-white font-mono text-xs sm:text-sm"
                />
                <RippleButton
                  onClick={() => {
                    navigator.clipboard.writeText(cardapioUrl);
                    toast.success("Link copiado!");
                  }}
                  className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap text-sm sm:text-base"
                >
                  📋 Copiar
                </RippleButton>
              </div>
              <p className="text-xs sm:text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                💡 Dica: Use um QR Code online para compartilhar com clientes!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total de Produtos</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{cardapio.products.length}</p>
                  </div>
                  <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl">🍽️</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Categorias</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{cardapio.categories.length}</p>
                  </div>
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-3xl">📂</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Disponíveis</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">
                      {cardapio.products.filter((p) => p.available).length}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-3xl">✅</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categorias Tab */}
        {activeTab === "categorias" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Categorias</h2>
            </div>

            <div className="p-4 sm:p-8">
              {/* New Category Form */}
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Adicionar Nova Categoria</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddCategory();
                      }
                    }}
                    placeholder="Digite o nome..."
                    autoComplete="off"
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 font-medium transition-all text-sm sm:text-base"
                  />
                  <RippleButton
                    onClick={handleAddCategory}
                    className="bg-green-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap text-sm sm:text-base"
                  >
                    + Adicionar
                  </RippleButton>
                </div>
              </div>

              {/* Categories List */}
              <div className="space-y-2 sm:space-y-3">
                {cardapio.categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma categoria criada ainda</p>
                ) : (
                  cardapio.categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all gap-3 sm:gap-0"
                    >
                      {editingCategoryId === category.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-semibold text-sm sm:text-base"
                          />
                          <div className="flex gap-2 w-full sm:w-auto sm:ml-4">
                            <RippleButton
                              onClick={() => handleEditCategory(category.id)}
                              className="flex-1 sm:flex-none bg-blue-600 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium hover:bg-blue-700"
                            >
                              ✓ Salvar
                            </RippleButton>
                            <RippleButton
                              onClick={() => setEditingCategoryId(null)}
                              className="flex-1 sm:flex-none bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium hover:bg-gray-400"
                            >
                              ✕ Cancelar
                            </RippleButton>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{category.name}</h3>
                            <p className="text-xs text-gray-500">ID: {category.id}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <RippleButton
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                              className="flex-1 sm:flex-none bg-blue-100 text-blue-600 px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium hover:bg-blue-200"
                            >
                              ✏️ Editar
                            </RippleButton>
                            <RippleButton
                              onClick={() => handleDeleteCategory(category.id)}
                              className="flex-1 sm:flex-none bg-red-100 text-red-600 px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium hover:bg-red-200"
                            >
                              🗑️ Deletar
                            </RippleButton>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Produtos Tab */}
        {activeTab === "produtos" && (() => {
          const filteredProducts = filterCategory
            ? cardapio.products.filter((p) => p.category === filterCategory)
            : cardapio.products;

          return (
            <div className="space-y-6">
              {/* Add Product Form */}
              {showProductForm && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                    {editingProduct ? "Editar Produto" : "Novo Produto"}
                  </h2>
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

              {/* Novo Produto Button + Filtro por Categoria */}
              {!showProductForm && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Filtro por Categoria */}
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

                  <RippleButton
                    onClick={() => {
                      setEditingProduct(null);
                      setShowProductForm(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                  >
                    <span className="text-lg">+</span>
                    <span>Novo Produto</span>
                  </RippleButton>
                </div>
              )}

              {/* Products List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {filteredProducts.length === 0 ? (
                  <div className="px-8 py-12 text-center">
                    <p className="text-gray-500 text-lg">
                      {filterCategory
                        ? "Nenhum produto nesta categoria"
                        : "Nenhum produto cadastrado ainda"}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {filterCategory
                        ? "Selecione outra categoria ou adicione um produto"
                        : 'Clique em "+ Novo Produto" para comecar'}
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
        })()}
      </main>
    </div>
  );
}
