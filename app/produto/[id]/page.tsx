"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MenuItem, Category } from "@/lib/validation";

interface Adicional {
  id: string;
  name: string;
  price: number;
}

export default function ProdutoDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [produto, setProduto] = useState<MenuItem | null>(null);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryColor, setCategoryColor] = useState("#7c4e42");

  // Adicionais
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [selectedAdicionais, setSelectedAdicionais] = useState<Set<string>>(new Set());

  // Cores para categorias (mesmo padrão do MenuItem)
  const CATEGORY_COLORS = [
    "#7c4e42",
    "#2563eb",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#be185d",
    "#65a30d",
    "#ea580c",
  ];

  const getCategoryColor = (categoryName: string): string => {
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obter o ID (pode ser string ou array)
        const id = Array.isArray(params.id) ? params.id[0] : params.id;

        // Buscar dados do banco (Turso) via /api/sync
        const [syncRes, adicRes] = await Promise.all([
          fetch("/api/sync"),
          fetch(`/api/adicionais?product_id=${id}`),
        ]);
        const syncData = await syncRes.json();
        const adicData = await adicRes.json();

        setCategorias(syncData.categories || []);
        setAdicionais(adicData.adicionais || []);

        // Encontrar o produto no array de products
        const foundProduct = (syncData.products || []).find(
          (item: MenuItem) => item.id === id
        );

        if (foundProduct) {
          setProduto(foundProduct);
          const catName = syncData.categories?.find(
            (c: Category) => c.id === foundProduct.category
          )?.name || "N/A";
          setCategoryColor(getCategoryColor(catName));
        } else {
          // Produto não encontrado
          setTimeout(() => router.push("/"), 2000);
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const getCategoryName = (categoryId: string): string => {
    return categorias.find((c) => c.id === categoryId)?.name || "N/A";
  };

  const toggleAdicional = (id: string) => {
    setSelectedAdicionais(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Preço base + adicionais selecionados
  const basePrice = typeof produto?.price === "number" ? produto.price : 0;
  const adicionaisTotal = adicionais
    .filter(a => selectedAdicionais.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + adicionaisTotal;

  const handleWhatsApp = () => {
    if (!produto) return;
    const baseMsg = `Olá! Gostaria de pedir:\n\n*${produto.name}*`;
    let adicionaisMsg = "";
    if (selectedAdicionais.size > 0) {
      const selecionados = adicionais.filter(a => selectedAdicionais.has(a.id));
      adicionaisMsg = "\n\nAdicionais:\n" + selecionados.map(a => `• ${a.name}`).join("\n");
    }
    const priceMsg = `\n\nTotal: R$ ${totalPrice.toFixed(2)}`;
    const message = baseMsg + adicionaisMsg + priceMsg;
    const whatsappUrl = `https://wa.me/5527997835980?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#7c4e42] rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <span className="text-6xl block mb-4">🔍</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Produto não encontrado
          </h1>
          <p className="text-gray-600 mb-4">
            Redirecionando para a página principal...
          </p>
        </div>
      </div>
    );
  }

  const categoryName = getCategoryName(produto.category);
  const isUnavailable = !produto.available;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Barra colorida do topo */}
      <div
        className="h-1 w-full sticky top-0 z-50"
        style={{
          background: `linear-gradient(90deg, ${categoryColor}, ${categoryColor}aa)`,
        }}
      />

      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-4 sm:left-6 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors duration-200 shadow-lg"
        aria-label="Voltar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      {/* Imagem em destaque com fundo blur (espelho) */}
      <div
        className="relative w-full h-[50vh] sm:h-[60vh] overflow-hidden flex items-center justify-center"
        style={{
          opacity: isUnavailable ? 0.6 : 1,
          backgroundColor: "#1a1207",
        }}
      >
        {/* Camada de fundo: mesma imagem com blur (efeito espelho) */}
        {produto.image && produto.image.trim() !== "" && (
          <img
            src={produto.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50"
            aria-hidden="true"
          />
        )}

        {/* Imagem principal: completa, sem corte */}
        {produto.image && produto.image.trim() !== "" ? (
          <img
            src={produto.image}
            alt={produto.name}
            className="absolute inset-0 w-full h-full object-contain z-10 drop-shadow-2xl p-4"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-amber-300 z-10">
            <span className="text-9xl">🥐</span>
          </div>
        )}

        {/* Badge indisponível */}
        {isUnavailable && (
          <span className="absolute top-6 left-6 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg bg-red-500 z-20">
            Indisponível
          </span>
        )}
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col p-5 sm:p-8">
        <div className="flex-1 flex flex-col">

          {/* Categoria + Nome */}
          <div className="mb-3">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-2"
              style={{
                backgroundColor: `${categoryColor}10`,
                color: categoryColor,
                borderColor: `${categoryColor}30`,
              }}
            >
              {categoryName}
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
              {produto.name}
            </h1>
          </div>

          {/* Descrição */}
          {produto.description && (
            <p className="text-sm sm:text-lg text-gray-600 leading-relaxed whitespace-pre-line mb-4">
              {produto.description}
            </p>
          )}

          {/* Preço */}
          <div className="pt-4 border-t border-gray-200 mb-4">
            <p className="text-gray-500 text-xs font-medium mb-1">
              {selectedAdicionais.size > 0 ? "Total" : "Preço"}
            </p>
            <p className="text-3xl sm:text-5xl font-extrabold text-[#7c4e42] transition-all">
              R$ {totalPrice.toFixed(2)}
            </p>
            {selectedAdicionais.size > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Base R$ {basePrice.toFixed(2)} + adicionais R$ {adicionaisTotal.toFixed(2)}
              </p>
            )}
          </div>

          {/* ── ADICIONAIS ── Entre o preço e o botão WhatsApp */}
          {adicionais.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                Adicionar ao pedido
              </p>
              <div className="space-y-2">
                {adicionais.map((ad) => {
                  const isSelected = selectedAdicionais.has(ad.id);
                  return (
                    <button
                      key={ad.id}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => toggleAdicional(ad.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                        isSelected
                          ? "bg-green-50 border-green-400 shadow-sm"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-green-500 text-white"
                            : "bg-white border-2 border-green-400 text-green-500"
                        }`}>
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span className="font-semibold text-gray-800 text-base">{ad.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão WhatsApp — sempre o último */}
          <div className="mt-auto pt-2">
            <button
              onClick={handleWhatsApp}
              disabled={isUnavailable}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors duration-200 flex items-center justify-center gap-3 shadow-lg text-lg"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.769c0 2.589.875 5.022 2.472 6.923l-2.598 9.556 9.786-3.14c1.999 1.158 4.334 1.809 6.784 1.809h.007c5.396 0 9.767-4.413 9.767-9.859 0-2.637-.875-5.061-2.472-6.966 1.6-1.905 2.472-4.329 2.472-6.966C21.52 6.413 17.15 2 11.77 2Z" />
              </svg>
              <span>
                {isUnavailable ? "Produto Indisponível" : "Pedir pelo WhatsApp"}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
