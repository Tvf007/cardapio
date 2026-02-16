"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCardapio } from "@/contexts/CardapioContext";
import { RippleButton } from "@/components/RippleButton";
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

  // Verificar se está na página raiz de admin
  const isRootAdmin = pathname === "/admin";

  // Verificar auth para sub-páginas (produtos, categorias, etc.)
  // A página raiz /admin já tem seu próprio controle de auth
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

  // Extrair breadcrumb baseado na rota
  const getBreadcrumb = () => {
    if (isRootAdmin) return "Dashboard";
    if (pathname === "/admin/categorias") return "Dashboard > Categorias";
    if (pathname === "/admin/produtos") return "Dashboard > Produtos";
    if (pathname === "/admin/horarios") return "Dashboard > Horários";
    if (pathname === "/admin/imagens") return "Dashboard > Imagens";
    return "Admin";
  };

  const handleBack = () => {
    if (!isRootAdmin) {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: Breadcrumb or Back button */}
            <div className="flex items-center gap-3 min-w-0">
              {!isRootAdmin && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                  title="Voltar ao Dashboard"
                >
                  <span className="text-xl">←</span>
                </button>
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">{getBreadcrumb()}</p>
              </div>
            </div>

            {/* Right side: Status */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              {cardapio.lastSync && (
                <div className="text-gray-500">
                  <span className="hidden sm:inline">Sincronizado: </span>
                  {new Date(cardapio.lastSync).toLocaleTimeString("pt-BR")}
                </div>
              )}
              {cardapio.loading && (
                <div className="flex items-center gap-1 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="hidden sm:inline">Sincronizando...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 lg:px-8 py-6 sm:py-8">
        {!isRootAdmin && !authChecked ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7c4e42]"></div>
          </div>
        ) : !isRootAdmin && !isAuthenticated ? null : (
          children
        )}
      </main>
    </div>
  );
}
