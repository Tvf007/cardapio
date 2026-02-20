"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BoasVindasPage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showWifiModal, setShowWifiModal] = useState(false);

  const bannerImages = [
    { src: "/banner-1.jpg", alt: "Pães Frescos", title: "Pães Frescos" },
    { src: "/banner-2.jpg", alt: "Bolos & Doces", title: "Bolos & Doces" },
    { src: "/banner-3.jpg", alt: "Lanches Salgados", title: "Lanches Salgados" },
  ];

  // Carrossel automático
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#7c4e42] via-amber-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-[#7c4e42] text-center">
            🥐 Padaria Freitas
          </h1>
          <p className="text-center text-gray-600 text-sm mt-1">
            Especializada em pães, bolos e doces caseiros
          </p>
        </div>
      </div>

      {/* Seção principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-12">
        {/* Carrossel */}
        <div className="w-full max-w-2xl mb-8">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-100 to-orange-100">
            {/* Slides */}
            <div className="relative w-full h-full">
              {bannerImages.map((image, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-8xl block mb-4">
                        {index === 0 ? "🥐" : index === 1 ? "🎂" : "🥪"}
                      </span>
                      <p className="text-white text-2xl font-bold">
                        {image.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botões de navegação */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-lg"
              aria-label="Anterior"
            >
              ←
            </button>

            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-lg"
              aria-label="Próxima"
            >
              →
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentImageIndex ? "bg-white w-8" : "bg-white/50"
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Botões principais */}
        <div className="w-full max-w-md space-y-4 mb-8">
          {/* Ver Cardápio */}
          <Link href="/cardapio">
            <button className="w-full py-5 bg-gradient-to-r from-[#7c4e42] to-[#5c3e32] hover:from-[#5c3e32] hover:to-[#4c2e22] text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-lg">
              📋 Ver Cardápio
            </button>
          </Link>

          {/* WhatsApp */}
          <a href="https://wa.me/5527997835980" target="_blank" rel="noopener noreferrer">
            <button className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              💬 WhatsApp
            </button>
          </a>

          {/* Instagram */}
          <a href="https://www.instagram.com/padariaeconfeitariafreitas" target="_blank" rel="noopener noreferrer">
            <button className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
              📸 Instagram
            </button>
          </a>

          {/* Wi-Fi */}
          <button
            onClick={() => setShowWifiModal(true)}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            📡 Wi-Fi Disponível
          </button>
        </div>

        {/* Informações */}
        <div className="w-full max-w-md bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-[#7c4e42] mb-4 text-center">
            Bem-vindo à Padaria Freitas! 👋
          </h3>
          <p className="text-gray-700 text-center text-sm leading-relaxed mb-4">
            Explore nosso cardápio digital com todos os nossos produtos frescos e deliciosos.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p>✨ Pães feitos na hora</p>
            <p>🎂 Bolos e doces artesanais</p>
            <p>🥪 Lanches variados</p>
            <p>☕ Bebidas refrescantes</p>
          </div>
        </div>
      </div>

      {/* Modal Wi-Fi */}
      {showWifiModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowWifiModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowWifiModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              ✕
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📡</span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Wi-Fi Disponível
              </h2>

              <p className="text-gray-600 mb-6">
                Conecte-se à nossa rede Wi-Fi para aproveitar melhor nossos serviços!
              </p>

              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Nome da Rede (SSID):</p>
                <p className="text-xl font-bold text-[#7c4e42] break-all mb-4">
                  Padaria-Freitas-WiFi
                </p>

                <p className="text-sm text-gray-600 mb-2">Senha:</p>
                <p className="text-xl font-bold text-[#7c4e42] break-all">
                  Padaria2024
                </p>
              </div>

              <button
                onClick={() => setShowWifiModal(false)}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
