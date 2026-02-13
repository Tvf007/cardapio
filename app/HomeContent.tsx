"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { CategoryFilter, MenuGrid, MenuGridSkeleton } from "@/components";
import { useCardapio } from "@/contexts/CardapioContext";

const WHATSAPP_URL = "https://wa.me/5527997835980";
const INSTAGRAM_URL = "https://www.instagram.com/padariaeconfeitariafreitas";

// Verifica se está aberto com base nos horários
function checkIsOpen(horarioSemana: string, horarioDomingo: string): boolean {
  try {
    const now = new Date();
    const day = now.getDay(); // 0 = domingo
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const horario = day === 0 ? horarioDomingo : horarioSemana;

    // Extrair horários do formato "Seg a Sab: 5h30 - 20h30"
    const match = horario.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/);
    if (!match) return true;

    const openH = parseInt(match[1]);
    const openM = parseInt(match[2] || "0");
    const closeH = parseInt(match[3]);
    const closeM = parseInt(match[4] || "0");

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } catch {
    return true;
  }
}

export function HomeContent() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [horarioSemana, setHorarioSemana] = useState("Seg a Sab: 5h30 - 20h30");
  const [horarioDomingo, setHorarioDomingo] = useState("Domingo: 5h30 - 13h30");
  const [isOpen, setIsOpen] = useState(true);
  const hasAutoSelected = useRef(false);
  const cardapio = useCardapio();

  // Carregar horários do servidor
  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const res = await fetch("/api/site-config?key=horarios");
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            const semana = data.value.semana || "Seg a Sab: 5h30 - 20h30";
            const domingo = data.value.domingo || "Domingo: 5h30 - 13h30";
            setHorarioSemana(semana);
            setHorarioDomingo(domingo);
            setIsOpen(checkIsOpen(semana, domingo));
          }
        }
      } catch {
        // Usa valores padrão
      }
    };
    loadHorarios();
  }, []);

  // Atualizar status aberto/fechado a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOpen(checkIsOpen(horarioSemana, horarioDomingo));
    }, 60000);
    return () => clearInterval(interval);
  }, [horarioSemana, horarioDomingo]);

  const categories = cardapio.categories;
  const menuItems = cardapio.products;
  const displayLogo = cardapio.logo;

  // Começar em "Todos" para mostrar separadores
  useEffect(() => {
    if (!hasAutoSelected.current && categories.length > 0) {
      hasAutoSelected.current = true;
      setActiveCategory(null);
    }
  }, [categories]);

  // Filtragem de itens
  const filteredItems = useMemo(
    () =>
      activeCategory
        ? menuItems.filter((item) => item.category === activeCategory)
        : menuItems,
    [activeCategory, menuItems]
  );

  const handleCategoryChange = useCallback((categoryId: string | null) => {
    setActiveCategory(categoryId);
  }, []);

  // Itens em destaque (categoria "destaques" ou "promoções")
  const highlightItems = useMemo(() => {
    const highlightCat = categories.find((c) => {
      const name = c.name.toLowerCase();
      return name.includes("destaque") || name.includes("promoção") || name.includes("promocao") || name.includes("oferta");
    });
    if (!highlightCat) return [];
    return menuItems.filter((item) => item.category === highlightCat.id && item.available);
  }, [categories, menuItems]);

  const currentYear = new Date().getFullYear();

  // Skeleton loading
  if (cardapio.loading && cardapio.categories.length === 0) {
    return (
      <div className="min-h-screen warm-pattern-bg">
        <header className="header-banner">
          <div className="relative z-10 px-4 pt-8 pb-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="logo-circle">
                <span className="text-4xl">🍞</span>
              </div>
              <h1 className="text-xl font-bold text-white">Padaria Freitas</h1>
              <p className="text-amber-200/70 text-sm">Carregando cardápio...</p>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">
          <MenuGridSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen warm-pattern-bg">
      {/* ===== HEADER COM BANNER + LOGO CIRCULAR ===== */}
      <header className="header-banner">
        {/* Imagem de capa (logo como background sutil) */}
        {displayLogo && (
          <img
            src={displayLogo}
            alt=""
            className="header-cover-image"
            aria-hidden="true"
          />
        )}

        <div className="relative z-10 px-4 pt-8 pb-6 text-center">
          <div className="flex flex-col items-center gap-2">
            {/* Logo circular estilo rede social */}
            <div className="logo-circle">
              {displayLogo ? (
                <img
                  src={displayLogo}
                  alt="Logo Padaria Freitas"
                />
              ) : (
                <span className="text-4xl">🍞</span>
              )}
            </div>

            {/* Nome do estabelecimento */}
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Padaria Freitas
            </h1>

            {/* Status aberto/fechado */}
            <div className={`status-badge ${isOpen ? 'open' : 'closed'}`}>
              <span className={`status-dot ${isOpen ? 'open' : 'closed'}`} />
              {isOpen ? "Aberto agora" : "Fechado"}
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-8">

        {/* Seção de Destaques (se houver categoria destaque) */}
        {highlightItems.length > 0 && (
          <div className="highlights-section">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⭐</span>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Destaques</h2>
              <span className="text-xs text-gray-400 font-medium">Ofertas especiais</span>
            </div>
            <div className="highlights-scroll">
              {highlightItems.map((item) => (
                <div key={item.id} className="highlight-card">
                  <div className="relative h-36 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                    {item.image && item.image.trim() !== "" ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-300">
                        <span className="text-4xl">⭐</span>
                      </div>
                    )}
                    <span className="highlight-badge">Destaque</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    <p className="font-extrabold text-[#7c4e42] text-base mt-1.5">
                      R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtro de categorias */}
        <div className="mb-5 sm:mb-8">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Grid de produtos */}
        <div>
          {filteredItems.length > 0 ? (
            <MenuGrid
              items={filteredItems}
              categories={categories}
              showCategoryDividers={activeCategory === null}
            />
          ) : (
            <div className="text-center py-16">
              <span className="text-5xl block mb-3">🔍</span>
              <p className="text-gray-400 text-base">Nenhum item encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="footer-gradient text-white mt-12 sm:mt-16">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-base mb-3 text-amber-200">Padaria Freitas</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Seu cardápio digital moderno e intuitivo
              </p>
            </div>
            <div>
              <h3 className="font-bold text-base mb-3 text-amber-200">Horário</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {horarioSemana}<br />
                {horarioDomingo}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-base mb-3 text-amber-200">Contato</h3>
              <div className="flex gap-3 justify-center md:justify-start">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                  aria-label="Fale conosco pelo WhatsApp"
                >
                  <FaWhatsapp size={16} />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                  aria-label="Siga nosso Instagram"
                >
                  <FaInstagram size={16} />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-gray-500 text-xs">
              &copy; {currentYear} Padaria Freitas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* ===== BOTÃO WHATSAPP FLUTUANTE ===== */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab"
        aria-label="Fale conosco pelo WhatsApp"
      >
        <FaWhatsapp size={28} />
      </a>
    </div>
  );
}
