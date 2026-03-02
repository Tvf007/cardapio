"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";

interface WifiInfo {
  rede: string;
  senha: string;
}

const MAX_BANNERS = 6;

export default function AdminBoasVindasPage() {
  const toast = useToast();

  // Banners
  const [banners, setBanners] = useState<string[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [savingBanners, setSavingBanners] = useState(false);

  // Wi-Fi
  const [rede, setRede] = useState("");
  const [senha, setSenha] = useState("");
  const [savingWifi, setSavingWifi] = useState(false);
  const [wifiAtivo, setWifiAtivo] = useState(false);

  const [loading, setLoading] = useState(true);

  // Carregar dados existentes
  useEffect(() => {
    const load = async () => {
      try {
        const [bannersRes, wifiRes] = await Promise.all([
          fetch("/api/site-config?key=banners"),
          fetch("/api/site-config?key=wifi"),
        ]);
        if (bannersRes.ok) {
          const data = await bannersRes.json();
          if (Array.isArray(data.value)) setBanners(data.value.filter(Boolean));
        }
        if (wifiRes.ok) {
          const data = await wifiRes.json();
          if (data.value?.rede) {
            setRede(data.value.rede);
            setSenha(data.value.senha || "");
            setWifiAtivo(true);
          }
        }
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Upload de banner
  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(slot);
    try {
      const result = await uploadImage(file, "banners");
      const updated = [...banners];
      updated[slot] = result.url;
      setBanners(updated);
      // Salvar imediatamente
      await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "banners", value: updated }),
        credentials: "include",
      });
      toast.success(`Banner ${slot + 1} salvo! (${result.sizeKB}KB)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  }, [banners, toast]);

  // Remover banner
  const removeBanner = useCallback(async (slot: number) => {
    const updated = banners.filter((_, i) => i !== slot);
    setBanners(updated);
    setSavingBanners(true);
    try {
      await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "banners", value: updated }),
        credentials: "include",
      });
      toast.success("Banner removido");
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setSavingBanners(false);
    }
  }, [banners, toast]);

  // Salvar Wi-Fi
  const saveWifi = async () => {
    if (!rede.trim()) { toast.error("Digite o nome da rede Wi-Fi"); return; }
    setSavingWifi(true);
    try {
      const value: WifiInfo = { rede: rede.trim(), senha: senha.trim() };
      await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "wifi", value }),
        credentials: "include",
      });
      setWifiAtivo(true);
      toast.success("Wi-Fi salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar Wi-Fi");
    } finally {
      setSavingWifi(false);
    }
  };

  // Remover Wi-Fi
  const removeWifi = async () => {
    setSavingWifi(true);
    try {
      await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "wifi", value: null }),
        credentials: "include",
      });
      setRede(""); setSenha(""); setWifiAtivo(false);
      toast.success("Wi-Fi removido");
    } catch {
      toast.error("Erro ao remover Wi-Fi");
    } finally {
      setSavingWifi(false);
    }
  };

  const inputClass = "w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#7c4e42] bg-white text-gray-900 text-base font-medium transition-colors";
  const labelClass = "block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7c4e42]"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ── BANNERS / PROPAGANDAS ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <span className="text-2xl">🖼️</span>
          <div>
            <p className="font-bold text-gray-900">Propagandas / Banners</p>
            <p className="text-xs text-gray-400">Até {MAX_BANNERS} imagens · passam automaticamente a cada 4s</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {Array.from({ length: MAX_BANNERS }).map((_, slot) => {
            const src = banners[slot];
            const isUploading = uploadingIdx === slot;

            return (
              <div key={slot} className="relative">
                <p className={labelClass}>Banner {slot + 1} {slot === 0 ? "(principal)" : ""}</p>
                {src ? (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: "16/9" }}>
                    <img src={src} alt={`Banner ${slot + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all" />
                    <button
                      onClick={() => removeBanner(slot)}
                      disabled={savingBanners}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 transition-all shadow-lg"
                    >✕</button>
                    <label className="absolute bottom-3 right-3 cursor-pointer">
                      <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-black/70 transition-all">
                        Trocar foto
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleBannerUpload(e, slot)} />
                    </label>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-2xl transition-all flex items-center justify-center gap-4 px-5 ${
                      isUploading ? "border-[#7c4e42] bg-amber-50" : "border-gray-200 hover:border-[#7c4e42] hover:bg-amber-50/30"
                    }`} style={{ aspectRatio: "16/9" }}>
                      {isUploading ? (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#7c4e42] border-t-transparent mx-auto mb-2"></div>
                          <p className="text-sm font-semibold text-gray-600">Enviando...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-4xl block mb-2">📸</span>
                          <p className="text-sm font-semibold text-gray-600">Toque para adicionar</p>
                          <p className="text-xs text-gray-400 mt-1">Recomendado: 16:9 · até 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={e => handleBannerUpload(e, slot)}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── WI-FI ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📶</span>
            <div>
              <p className="font-bold text-gray-900">Wi-Fi</p>
              <p className="text-xs text-gray-400">Aparece na página de boas-vindas</p>
            </div>
          </div>
          {wifiAtivo && (
            <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">Ativo</span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Nome da Rede</label>
            <input
              type="text"
              value={rede}
              onChange={e => setRede(e.target.value)}
              placeholder="Ex: Padaria-Freitas-WiFi"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Senha</label>
            <input
              type="text"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Ex: padaria2024 (deixe em branco se for aberta)"
              className={inputClass}
            />
          </div>

          <button
            onClick={saveWifi}
            disabled={savingWifi}
            className="w-full bg-[#7c4e42] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#5a3a2f] transition-all disabled:opacity-50 shadow-lg shadow-[#7c4e42]/20"
          >
            {savingWifi ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Salvando...
              </span>
            ) : "✓ Salvar Wi-Fi"}
          </button>

          {wifiAtivo && (
            <button
              onClick={removeWifi}
              disabled={savingWifi}
              className="w-full bg-red-50 text-red-500 py-3 rounded-2xl font-semibold text-sm hover:bg-red-100 transition-all"
            >
              Remover Wi-Fi da página
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 rounded-2xl px-5 py-4 flex items-center gap-3">
        <span className="text-xl">👁️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-blue-800">Ver resultado</p>
          <p className="text-xs text-blue-600">Acesse a página de boas-vindas para ver como ficou</p>
        </div>
        <a
          href="/boas-vindas"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-xl transition-all"
        >
          Abrir ↗
        </a>
      </div>
    </div>
  );
}
