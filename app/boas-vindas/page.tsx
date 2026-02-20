"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BoasVindasPage() {
  const [imageIndex, setImageIndex] = useState(0);
  const [showWifi, setShowWifi] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setImageIndex(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#7c4e42] to-white p-6 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#7c4e42] mb-2">🥐 Padaria Freitas</h1>
          <p className="text-gray-600">Especializada em pães e doces caseiros</p>
        </div>

        <div className="w-full max-w-md aspect-square bg-gradient-to-br from-amber-300 to-orange-400 rounded-2xl flex items-center justify-center text-6xl shadow-lg">
          {imageIndex === 0 ? "🥐" : imageIndex === 1 ? "🎂" : "🥪"}
        </div>

        <div className="w-full max-w-md space-y-3">
          <Link href="/cardapio">
            <button className="w-full py-4 bg-[#7c4e42] hover:bg-[#5c3e32] text-white font-bold rounded-xl transition-all">
              📋 Ver Cardápio
            </button>
          </Link>
          <a href="https://wa.me/5527997835980" target="_blank" rel="noopener noreferrer">
            <button className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all">
              💬 WhatsApp
            </button>
          </a>
          <a href="https://www.instagram.com/padariaeconfeitariafreitas" target="_blank" rel="noopener noreferrer">
            <button className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-all">
              📸 Instagram
            </button>
          </a>
          <button
            onClick={() => setShowWifi(true)}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
          >
            📡 Wi-Fi
          </button>
        </div>
      </div>

      {showWifi && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4">Wi-Fi Disponível</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-1">Rede:</p>
              <p className="font-bold text-[#7c4e42] text-lg">Padaria-Freitas-WiFi</p>
              <p className="text-sm text-gray-600 mt-3 mb-1">Senha:</p>
              <p className="font-bold text-[#7c4e42] text-lg">Padaria2024</p>
            </div>
            <button
              onClick={() => setShowWifi(false)}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
