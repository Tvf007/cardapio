"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AdminLogin } from "@/components/AdminLogin";
import { QRCodeModal } from "@/components/QRCodeModal";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { loginWithPassword, logout, getCurrentUser, AuthUser } from "@/lib/auth";

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
      toast.success("Logout realizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer logout");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await cardapio.refresh();
      toast.success("Sincronizado!");
    } catch {
      toast.error("Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center warm-pattern-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7c4e42] mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLogin={handleLogin} isLoading={loading} />;
  }

  const cardapioUrl = typeof window !== "undefined" ? window.location.origin : "";

  const menuItems = [
    { id: "categorias", icon: "📁", label: "Categorias", action: () => router.push("/admin/categorias") },
    { id: "produtos", icon: "🍽️", label: "Produtos", action: () => router.push("/admin/produtos") },
    { id: "horarios", icon: "🕐", label: "Horários", action: () => router.push("/admin/horarios") },
    { id: "imagens", icon: "🖼️", label: "Imagens", action: () => router.push("/admin/imagens") },
    { id: "qrcode", icon: "📱", label: "QR Code", action: () => setShowQRCodeModal(true) },
  ];

  return (
    <div className="min-h-screen warm-pattern-bg">
      {/* ===== HEADER IGUAL AO CARDÁPIO PÚBLICO ===== */}
      <header className="header-banner">
        {/* Imagem de capa (logo como background sutil) */}
        {logo && (
          <Image
            src={logo}
            alt=""
            fill
            className="header-cover-image"
            aria-hidden="true"
            priority
          />
        )}

        <div className="relative z-10 px-4 pt-8 pb-6 text-center">
          <div className="flex flex-col items-center gap-2">
            {/* Logo circular — MESMO do cardápio público */}
            <div className="logo-circle">
              {logo ? (
                <Image
                  src={logo}
                  alt="Logo"
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <span className="text-4xl">🍞</span>
              )}
            </div>

            {/* Título */}
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Gerenciador de Cardápio
            </h1>
          </div>

          {/* Botão sair — discreto no canto */}
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 text-white/40 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all z-20"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ===== CARDS CENTRALIZADOS ===== */}
      <main className="max-w-md mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={item.action}
              className="admin-card"
              style={{ animationDelay: `${index * 0.07}s` }}
            >
              <span className="admin-card-icon">{item.icon}</span>
              <span className="admin-card-title">{item.label}</span>
            </button>
          ))}

          {/* Sincronização — com info extra de status */}
          <button
            onClick={handleSync}
            className="admin-card"
            style={{ animationDelay: `${menuItems.length * 0.07}s` }}
          >
            {(syncing || cardapio.loading) && (
              <div className="absolute top-3 right-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
            <span className={`admin-card-icon ${syncing ? "animate-spin" : ""}`}>☁️</span>
            <span className="admin-card-title">Sincronização</span>
            <span className="admin-card-count">
              {cardapio.lastSync
                ? new Date(cardapio.lastSync).toLocaleTimeString("pt-BR")
                : "Aguardando..."}
            </span>
          </button>
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
