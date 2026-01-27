"use client";

import { useState, useEffect, useRef } from "react";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductForm } from "@/components/ProductForm";
import { AdminProductList } from "@/components/AdminProductList";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { loginWithEmail, logout, getCurrentUser, AuthUser } from "@/lib/auth";
import { MenuItem, Category } from "@/lib/validation";

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const cardapio = useCardapio();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    const savedLogo = localStorage.getItem("padaria-logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }

    loadUser();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await loginWithEmail(email, password);

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
      setShowForm(false);
      toast.success("Logout realizado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer logout");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogo(result);
        localStorage.setItem("padaria-logo", result);
        toast.success("Logo atualizado com sucesso!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (product: MenuItem) => {
    try {
      setSyncing(true);
      if (editingProduct) {
        await cardapio.updateProduct(product);
        toast.success("Produto atualizado com sucesso!");
      } else {
        await cardapio.addProduct(product);
        toast.success("Produto adicionado com sucesso!");
      }
      setEditingProduct(null);
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que quer deletar este produto?")) return;

    try {
      setSyncing(true);
      await cardapio.deleteProduct(id);
      toast.success("Produto deletado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar produto");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    try {
      setSyncing(true);
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
      };

      await cardapio.addCategory(newCategory);
      setNewCategoryName("");
      setShowNewCategoryForm(false);
      toast.success("Categoria criada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar categoria");
    } finally {
      setSyncing(false);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }

    try {
      setSyncing(true);
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
    } finally {
      setSyncing(false);
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
      setSyncing(true);
      await cardapio.deleteCategory(categoryId);
      toast.success("Categoria deletada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar categoria");
    } finally {
      setSyncing(false);
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
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="relative w-12 h-12 rounded-lg flex items-center justify-center hover:opacity-80 transition-all duration-200 shadow-md hover:shadow-lg group cursor-pointer"
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
              <p className="text-xs text-gray-600">
                Logado como <span className="font-semibold">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {cardapio.loading && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full"></div>
                Sincronizando...
              </div>
            )}
            {cardapio.error && (
              <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg max-w-xs">
                ⚠️ {cardapio.error}
              </div>
            )}
            <RippleButton
              onClick={handleLogout}
              disabled={syncing}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              Sair
            </RippleButton>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                toast.success("Link copiado com sucesso!");
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              📋 Copiar
            </RippleButton>
          </div>
          <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 Dica: Use um gerador de QR Code online com este link para criar um QR Code e compartilhe com seus
            clientes!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Produtos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{cardapio.products.length}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">🍽️</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Categorias</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{cardapio.categories.length}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">📂</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Disponíveis</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {cardapio.products.filter((p) => p.available).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-2xl">✅</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}