"use client";

import { useState, useEffect } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { CategoryFilter, MenuGrid, MenuGridSkeleton } from "@/components";
import { useCardapio } from "@/contexts/CardapioContext";

const WHATSAPP_URL = "https://wa.me/5527997835980";
const INSTAGRAM_URL = "https://www.instagram.com/padariaeconfeitariafreitas";

export function HomeContent() {
  const [logo, setLogo] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const cardapio = useCardapio();

  const categories = cardapio.categories;
  const menuItems = cardapio.products;

  useEffect(() => {
    const savedLogo = localStorage.getItem("padaria-logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category === activeCategory)
    : menuItems;

  const currentYear = new Date().getFullYear();

  // Mostrar skeleton loading enquanto carrega E não há dados em cache
  if (cardapio.loading && cardapio.categories.length === 0) {
    return (
      <div className="min-h-screen bg-amber-50">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b shadow-lg header-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-bold tracking-widest text-amber-100">
                PADARIA FREITAS
              </p>
              <div className="w-24 h-24 rounded-xl flex items-center justify-center shadow-lg bg-[#d4a574]">
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo Padaria Freitas"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-6xl" role="img" aria-label="Cardapio">&#127869;</span>
                )}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-[3px]">
                CARDAPIO
              </h1>
            </div>
          </div>
        </header>

        {/* Main Content - Loading */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo ao nosso cardapio
            </h2>
            <p className="text-gray-600">
              Carregando nossos deliciosos pratos...
            </p>
          </div>
          <MenuGridSkeleton />
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16 sm:mt-20 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-lg mb-4">PADARIA Freitas</h3>
                <p className="text-gray-400 text-sm">
                  Seu cardapio digital moderno e intuitivo
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-4">Horario</h3>
                <p className="text-gray-400 text-sm">
                  Seg a Sab: 5h30 - 20h30<br />
                  Domingo: 5h30 - 13h30
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-4">Contato</h3>
                <div className="flex gap-6 justify-center md:justify-start">
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                    aria-label="Fale conosco pelo WhatsApp"
                  >
                    <FaWhatsapp size={18} />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                    aria-label="Siga nosso Instagram"
                  >
                    <FaInstagram size={18} />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-8 text-center">
              <p className="text-gray-500 text-sm">
                &copy; {currentYear} PADARIA Freitas. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b shadow-lg header-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-bold tracking-widest text-amber-100">
              PADARIA FREITAS
            </p>
            <div className="w-24 h-24 rounded-xl flex items-center justify-center shadow-lg bg-[#d4a574]">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo Padaria Freitas"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="text-6xl" role="img" aria-label="Cardapio">&#127869;</span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-[3px]">
              CARDAPIO
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bem-vindo ao nosso cardapio
          </h2>
          <p className="text-gray-600">
            Explore nossas deliciosas opcoes de lanches, sobremesas e bebidas
          </p>
        </div>

        <div className="mb-8 sm:mb-12">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        <div>
          {filteredItems.length > 0 ? (
            <MenuGrid items={filteredItems} categories={categories} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum item encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16 sm:mt-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">PADARIA Freitas</h3>
              <p className="text-gray-400 text-sm">
                Seu cardapio digital moderno e intuitivo
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Horario</h3>
              <p className="text-gray-400 text-sm">
                Seg a Sab: 5h30 - 20h30<br />
                Domingo: 5h30 - 13h30
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato</h3>
              <div className="flex gap-6 justify-center md:justify-start">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                  aria-label="Fale conosco pelo WhatsApp"
                >
                  <FaWhatsapp size={18} />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition-colors duration-200 shadow-md text-white font-medium text-sm"
                  aria-label="Siga nosso Instagram"
                >
                  <FaInstagram size={18} />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              &copy; {currentYear} PADARIA Freitas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
