"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCardapio } from "@/contexts/CardapioContext";
import { getCurrentUser } from "@/lib/auth";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const cardapio = useCardapio();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isRootAdmin = pathname === "/admin";

  useEffect(() => {
    if (isRootAdmin) {
      setAuthChecked(true);
      setIsAuthenticated(true);
      return;
    }

    let cancelled = false;
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/admin");
      } else {
        setIsAuthenticated(true);
      }
      setAuthChecked(true);
    };

    checkAuth();
    return () => { cancelled = true; };
  }, [isRootAdmin, router]);

  const getPageTitle = () => {
    if (pathname === "/admin/categorias") return "Categorias";
    if (pathname === "/admin/produtos") return "Produtos";
    if (pathname === "/admin/produtos/novo") return "Cadastro de Produto";
    if (pathname?.startsWith("/admin/produtos/editar")) return "Editar Produto";
    if (pathname === "/admin/horarios") return "Horários";
    if (pathname === "/admin/imagens") return "Imagens";
    return "";
  };

  const handleBack = () => {
    // Se está em sub-página de produtos (novo/editar), volta para produtos
    if (pathname?.startsWith("/admin/produtos/")) {
      router.push("/admin/produtos");
    } else {
      router.push("/admin");
    }
  };

  // Na página raiz, o dashboard cuida do seu próprio header
  if (isRootAdmin) {
    return (
      <div className="min-h-screen warm-pattern-bg flex flex-col">
        {children}
      </div>
    );
  }

  const logo = cardapio.logo;
  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen warm-pattern-bg flex flex-col">
      {/* Header com banner estilo cardápio */}
      <header className="admin-banner sticky top-0 z-50">
        <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Lado esquerdo: voltar + logo + título */}
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="admin-back-btn">
              <span>←</span>
              <span>Voltar</span>
            </button>

            <div className="admin-logo">
              {logo ? (
                <img src={logo} alt="Logo" />
              ) : (
                <span className="text-lg">🍞</span>
              )}
            </div>

            <h1 className="text-white font-bold text-lg">{pageTitle}</h1>
          </div>

          {/* Lado direito: sync status */}
          <div className="flex items-center gap-2 text-xs">
            {cardapio.loading && (
              <div className="flex items-center gap-1.5 text-amber-200">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-amber-200"></div>
                <span className="hidden sm:inline">Sincronizando</span>
              </div>
            )}
            {cardapio.lastSync && !cardapio.loading && (
              <span className="text-white/60 hidden sm:inline">
                {new Date(cardapio.lastSync).toLocaleTimeString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        {!authChecked ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7c4e42]"></div>
          </div>
        ) : !isAuthenticated ? null : (
          children
        )}
      </main>
    </div>
  );
}
