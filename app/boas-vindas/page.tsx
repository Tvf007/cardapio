"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCardapio } from "@/contexts/CardapioContext";

interface WifiInfo {
  rede: string;
  senha: string;
}

export default function BoasVindasPage() {
  const router = useRouter();
  const cardapio = useCardapio();
  const logo = cardapio.logo;

  const [banners, setBanners] = useState<string[]>([]);
  const [wifi, setWifi] = useState<WifiInfo | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [wifiCopied, setWifiCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carregar banners e Wi-Fi
  useEffect(() => {
    const load = async () => {
      try {
        const [bannersRes, wifiRes] = await Promise.all([
          fetch("/api/site-config?key=banners"),
          fetch("/api/site-config?key=wifi"),
        ]);
        if (bannersRes.ok) {
          const data = await bannersRes.json();
          if (data.value && Array.isArray(data.value)) {
            setBanners(data.value.filter(Boolean));
          }
        }
        if (wifiRes.ok) {
          const data = await wifiRes.json();
          if (data.value?.rede) setWifi(data.value);
        }
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (banners.length < 2) return;
    autoPlayRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [banners.length]);

  const goTo = useCallback((idx: number) => {
    setActiveSlide(idx);
    // Resetar timer ao clicar
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % banners.length);
    }, 4000);
  }, [banners.length]);

  const prev = useCallback(() => goTo((activeSlide - 1 + banners.length) % banners.length), [activeSlide, banners.length, goTo]);
  const next = useCallback(() => goTo((activeSlide + 1) % banners.length), [activeSlide, banners.length, goTo]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const copyWifi = async () => {
    if (!wifi) return;
    try {
      await navigator.clipboard.writeText(wifi.senha);
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="min-h-screen warm-pattern-bg flex flex-col">
      {/* ── HEADER ── */}
      <header className="header-banner">
        {logo && (
          <Image src={logo} alt="" fill className="header-cover-image object-cover" aria-hidden priority unoptimized />
        )}
        <div className="relative z-10 px-4 pt-8 pb-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="logo-circle">
              {logo ? (
                <Image src={logo} alt="Logo Padaria Freitas" fill className="object-cover" priority unoptimized />
              ) : (
                <span className="text-4xl">🍞</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">Padaria Freitas</h1>
            <p className="text-amber-200/80 text-sm">Bem-vindo! 👋</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5 pb-10">

        {/* ── CAROUSEL DE BANNERS ── */}
        {!loading && banners.length > 0 && (
          <div className="w-full">
            <div
              className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-gray-100"
              style={{ aspectRatio: "16/9" }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Slides */}
              {banners.map((src, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-500 ${i === activeSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
                  onClick={() => setLightboxImg(src)}
                >
                  <img src={src} alt={`Banner ${i + 1}`} className="w-full h-full object-cover cursor-pointer" />
                  {/* Lupa */}
                  <div className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 pointer-events-none">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
                      <line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/>
                    </svg>
                  </div>
                </div>
              ))}

              {/* Setas (só se tiver mais de 1 banner) */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                  >‹</button>
                  <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all"
                  >›</button>
                </>
              )}
            </div>

            {/* Indicadores de ponto */}
            {banners.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all ${i === activeSlide ? "w-6 h-2.5 bg-[#7c4e42]" : "w-2.5 h-2.5 bg-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WI-FI ── */}
        {wifi && (
          <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-5 py-3 flex items-center justify-center gap-3 border-b border-blue-100">
              <span className="text-2xl">📶</span>
              <span className="font-bold text-blue-800 text-base">Wi-Fi Disponível</span>
            </div>
            <div className="px-5 py-5 flex flex-col items-center gap-4 text-center">
              <div className="w-full">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-semibold">Rede</p>
                <p className="font-bold text-gray-800 text-xl break-all">{wifi.rede}</p>
              </div>
              {wifi.senha && (
                <div className="w-full">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-semibold">Senha</p>
                  <p className="font-bold text-gray-800 text-xl font-mono break-all mb-3">{wifi.senha}</p>
                  <button
                    onClick={copyWifi}
                    className={`w-full py-3 rounded-2xl text-sm font-bold transition-all ${
                      wifiCopied
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95"
                    }`}
                  >
                    {wifiCopied ? "✓ Senha copiada!" : "📋 Copiar Senha"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado de loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c4e42]"></div>
          </div>
        )}

        {/* ── BOTÃO VER CARDÁPIO (parte inferior, destaque com animação) ── */}
        <div className="mt-auto pt-4 w-full">
          <button
            onClick={() => router.push("/cardapio")}
            className="btn-float-cta w-full py-6 bg-[#7c4e42] hover:bg-[#5a3a2f] active:scale-[0.97] text-white font-black text-2xl rounded-3xl flex items-center justify-center gap-3"
          >
            <span className="text-3xl">📋</span>
            Ver Cardápio
          </button>
          <p className="text-center text-xs text-gray-400 mt-3 font-medium">Toque para ver nosso cardápio completo</p>
        </div>
      </main>

      {/* ── LIGHTBOX ── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl hover:bg-white/30 transition-all"
            onClick={() => setLightboxImg(null)}
          >✕</button>
          <img
            src={lightboxImg}
            alt="Ampliado"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
