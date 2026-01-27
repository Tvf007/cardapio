"use client";

import { useState, useEffect } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { CategoryFilter, MenuGrid } from "@/components";
import { categories as defaultCategories, menuItems as defaultMenuItems } from "@/data/menu";
import { useCardapio } from "@/contexts/CardapioContext";
import { MenuItem, Category } from "@/lib/validation";

export function HomeContent() {
  const [logo, setLogo] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const cardapio = useCardapio();

  // Usar categorias e produtos do context, com fallback para dados padrão
  const categories = cardapio.categories.length > 0 ? cardapio.categories : defaultCategories;
  const menuItems = cardapio.products.length > 0 ? cardapio.products : defaultMenuItems;

  useEffect(() => {
    // Carregar logo do localStorage
    const savedLogo = localStorage.getItem("padaria-logo");
    if (savedLogo) {
      setLogo(savedLogo);
    }
  }, []);

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category === activeCategory)
    : menuItems;

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#7c4e42' }}>
              {logo ? (
                <img
                  src={logo}
                  alt="Logo"
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="text-2xl">🍽️</span>
              )}
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                Cardápio
              </h1>
              <p className="text-sm text-blue-100 font-medium mt-2">PADARIA Freitas</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bem-vindo ao nosso cardápio
          </h2>
          <p className="text-gray-600">
            Explore nossas deliciosas opções de lanches, sobremesas e bebidas
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-12">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* Menu Grid */}
        <div>
          {filteredItems.length > 0 ? (
            <MenuGrid items={filteredItems} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum item encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">PADARIA Freitas</h3>
              <p className="text-gray-400 text-sm">
                Seu cardápio digital moderno e intuitivo
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Horário</h3>
              <p className="text-gray-400 text-sm">
                Seg a Sab: 5h30 - 20h30<br/>
                Domingo: 5h30 - 13h30
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Redes Sociais</h3>
              <div className="flex gap-4 justify-center md:justify-start">
                <a
                  href="https://wa.me/5527997835980"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg text-white"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={24} />
                </a>
                <a
                  href="https://www.instagram.com/padariaeconfeitariafreitas?igsh=MTNwcWN4Z3ZjMjBjeg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg text-white"
                  title="Instagram"
                >
                  <FaInstagram size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* Redes Sociais em destaque no centro */}
          <div className="border-t border-gray-800 py-8">
            <div className="text-center mb-6">
              <p className="text-gray-400 text-sm mb-4">Nos siga nas redes sociais</p>
              <div className="flex gap-6 justify-center">
                <a
                  href="https://wa.me/5527997835980"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full transition-all duration-200 shadow-md hover:shadow-lg text-white font-medium"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={20} />
                  <span>WhatsApp</span>
                </a>
                <a
                  href="https://www.instagram.com/padariaeconfeitariafreitas?igsh=MTNwcWN4Z3ZjMjBjeg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full transition-all duration-200 shadow-md hover:shadow-lg text-white font-medium"
                  title="Instagram"
                >
                  <FaInstagram size={20} />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 PADARIA Freitas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
