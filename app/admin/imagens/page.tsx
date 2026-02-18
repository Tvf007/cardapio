"use client";

import { useRef, useCallback, useState } from "react";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";

export default function ImagensPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const cardapio = useCardapio();
  const toast = useToast();
  const logo = cardapio.logo;

  const handleLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size / (1024 * 1024) > 10) { toast.error("Máximo 10MB"); return; }

    setUploading(true);
    try {
      // Upload via novo sistema (comprime WebP + Supabase Storage)
      const result = await uploadImage(file, "logo");

      // Salvar URL no servidor (em vez de base64)
      const response = await fetch("/api/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: result.url }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Erro: ${errorData.error || response.status}`);
        return;
      }

      // Salvar localmente também
      try { localStorage.setItem("padaria-logo", result.url); } catch {}

      try { await cardapio.refresh(); } catch {}
      toast.success(`Logo atualizado! (${result.sizeKB}KB)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar");
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }, [cardapio, toast]);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col items-center">
          {/* Preview circular */}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#f3ece9] shadow-lg flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 mb-4">
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">🍞</span>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-5">
            {logo ? "Logo atual" : "Sem logo definida"}
          </p>

          {/* Upload area */}
          <label className="cursor-pointer w-full">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#d4a574] hover:bg-[#fdf6ee]/30 transition-all">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c4e42] mx-auto mb-3"></div>
                  <p className="text-sm font-medium text-gray-500">Comprimindo e enviando...</p>
                </>
              ) : (
                <>
                  <span className="text-3xl block mb-2">📤</span>
                  <p className="font-semibold text-gray-700 text-sm">Toque para enviar</p>
                  <p className="text-xs text-gray-400 mt-1">Até 10MB • compressão automática WebP</p>
                </>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploading}
              className="hidden"
              aria-label="Upload logo"
            />
          </label>

          {logo && (
            <button
              onClick={() => {
                if (confirm("Remover a logo?")) {
                  localStorage.removeItem("padaria-logo");
                  fetch("/api/logo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ logo: null }),
                    credentials: "include",
                  }).then(() => cardapio.refresh().catch(() => {}));
                  toast.success("Logo removida!");
                }
              }}
              className="w-full mt-4 bg-red-50 text-red-500 px-4 py-2.5 rounded-xl text-xs font-medium hover:bg-red-100 transition-all"
            >
              Remover logo
            </button>
          )}
        </div>
      </div>

      {/* Fundo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <span className="font-bold text-gray-900 text-sm">Imagem de fundo</span>
        </div>
        <div className="p-4 text-center">
          {logo ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-full overflow-hidden rounded-xl border border-gray-100">
                <img src={logo} alt="Fundo" className="w-full h-28 object-cover opacity-25 blur-sm" />
              </div>
              <p className="text-xs text-gray-400">Mesma logo com transparência e desfoque</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-4">Envie a logo acima</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Imagens são comprimidas para WebP automaticamente
      </p>
    </div>
  );
}
