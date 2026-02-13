"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLogin } from "@/components/AdminLogin";
import { QRCodeModal } from "@/components/QRCodeModal";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { loginWithPassword, logout, getCurrentUser, AuthUser } from "@/lib/auth";

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const cardapio = useCardapio();
  const logo = cardapio.logo;

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
      toast.success("Logout realizado com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer logout");
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

  // Cards do dashboard
  const dashboardCards = [
    {
      id: "categorias",
      title: "Categorias",
      icon: "📁",
      subtitle: `${cardapio.categories.length} categorias`,
      description: "Gerenciar categorias de produtos",
      color: "from-green-50 to-emerald-50",
      borderColor: "border-green-200",
      action: () => router.push("/admin/categorias"),
    },
    {
      id: "produtos",
      title: "Produtos",
      icon: "🍽️",
      subtitle: `${cardapio.products.length} produtos`,
      description: "Adicionar, editar ou remover produtos",
      color: "from-yellow-50 to-orange-50",
      borderColor: "border-yellow-200",
      action: () => router.push("/admin/produtos"),
    },
    {
      id: "horarios",
      title: "Horários",
      icon: "🕐",
      subtitle: "Configurar horários",
      description: "Defina os horários de funcionamento",
      color: "from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      action: () => router.push("/admin/horarios"),
    },
    {
      id: "imagens",
      title: "Imagens",
      icon: "🖼️",
      subtitle: "Logo e backgrounds",
      description: "Gerenciar imagens do cardápio",
      color: "from-pink-50 to-rose-50",
      borderColor: "border-pink-200",
      action: () => router.push("/admin/imagens"),
    },
    {
      id: "qrcode",
      title: "QR Code",
      icon: "🔗",
      subtitle: "Compartilhe seu cardápio",
      description: "Visualizar e baixar QR Code",
      color: "from-purple-50 to-indigo-50",
      borderColor: "border-purple-200",
      action: () => setShowQRCodeModal(true),
    },
    {
      id: "sincronizacao",
      title: "Sincronização",
      icon: "☁️",
      subtitle: cardapio.lastSync
        ? `Última: ${new Date(cardapio.lastSync).toLocaleTimeString("pt-BR")}`
        : "Aguardando...",
      description: cardapio.loading ? "Sincronizando..." : "Status da sincronização",
      color: "from-gray-50 to-slate-50",
      borderColor: "border-gray-200",
      action: () => cardapio.refresh(),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#7c4e42" }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl">🍞</span>
                )}
              </div>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Bem-vindo ao painel de administração do seu cardápio</p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <button
              key={card.id}
              onClick={card.action}
              className={`bg-gradient-to-br ${card.color} border ${card.borderColor} rounded-2xl p-6 shadow-sm hover:shadow-lg hover:scale-105 transition-all duration-200 text-left group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl group-hover:scale-110 transition-transform duration-200">
                  {card.icon}
                </div>
                {card.id === "sincronizacao" && cardapio.loading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{card.subtitle}</p>
              <p className="text-xs text-gray-500">{card.description}</p>
            </button>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">💡 Dicas Úteis</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Crie <strong>categorias</strong> para organizar seus produtos</li>
            <li>✓ Adicione <strong>produtos</strong> com descrição, preço e imagem</li>
            <li>✓ Configure seus <strong>horários</strong> de funcionamento</li>
            <li>✓ Customize com suas <strong>imagens</strong> (logo e background)</li>
            <li>✓ Compartilhe o <strong>QR Code</strong> com seus clientes</li>
          </ul>
        </div>
      </main>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCodeModal}
        onClose={() => setShowQRCodeModal(false)}
        cardapioUrl={cardapioUrl}
        logo={logo}
      />
    </div>
  );
}
