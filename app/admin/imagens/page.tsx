"use client";

import { useRef, useCallback, useState } from "react";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Por favor, selecione um arquivo de imagem válido"));
      return;
    }

    const maxFileSizeMB = 10;
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSizeMB) {
      reject(
        new Error(`Arquivo muito grande. Máximo ${maxFileSizeMB}MB. Seu arquivo: ${fileSizeInMB.toFixed(1)}MB`)
      );
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 1200;
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      let result = canvas.toDataURL("image/jpeg", 0.8);
      let base64SizeInKB = (result.length * 3) / 4 / 1024;

      if (base64SizeInKB > 1500) {
        result = canvas.toDataURL("image/jpeg", 0.6);
        base64SizeInKB = (result.length * 3) / 4 / 1024;
      }

      if (base64SizeInKB > 1500) {
        reject(
          new Error(`Imagem muito pesada após compressão (${base64SizeInKB.toFixed(0)}KB). Tente uma imagem menor.`)
        );
        return;
      }

      resolve(result);
    };

    img.onerror = () => {
      reject(new Error("Erro ao carregar a imagem. Tente outro arquivo"));
    };

    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo"));
    };
    reader.readAsDataURL(file);
  });
}

export default function ImagensPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const cardapio = useCardapio();
  const toast = useToast();
  const logo = cardapio.logo;

  const handleLogoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    const maxFileSizeMB = 10;
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSizeMB) {
      toast.error(
        `Arquivo muito grande (${fileSizeInMB.toFixed(1)}MB). Máximo: ${maxFileSizeMB}MB.`
      );
      return;
    }

    setUploadingLogo(true);
    try {
      const compressedResult = await compressImage(file);

      const base64SizeKB = (compressedResult.length * 3) / 4 / 1024;
      if (base64SizeKB > 1500) {
        toast.error(
          `Imagem ainda muito grande após compressão (${base64SizeKB.toFixed(0)}KB). Máximo: 1500KB.`
        );
        return;
      }

      try {
        localStorage.setItem("padaria-logo", compressedResult);
      } catch (err) {
        toast.error("Erro ao salvar logo localmente. Tente novamente.");
        return;
      }

      try {
        const response = await fetch("/api/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo: compressedResult }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.details || errorData.error || `HTTP ${response.status}`;
          toast.error(`Erro ao sincronizar: ${errorMsg}`);
          return;
        }

        try {
          await cardapio.refresh();
        } catch (refreshError) {
          console.warn("Erro ao atualizar contexto:", refreshError);
        }

        toast.success("Logo atualizado!");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(`Erro ao sincronizar: ${errorMsg}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar imagem");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  }, [cardapio, toast]);

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Logo do cardápio</h3>
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Preview */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-100 shadow-md flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🍞</span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {logo ? "Logo atual" : "Sem logo"}
              </span>
            </div>

            {/* Upload area */}
            <div className="flex-1 w-full">
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
              >
                <span className="text-3xl block mb-2">📤</span>
                <p className="font-semibold text-gray-700 text-sm">Clique para enviar</p>
                <p className="text-xs text-gray-400 mt-1">Aceita fotos do celular até 10MB</p>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className="hidden"
                aria-label="Upload logo"
              />

              {uploadingLogo && (
                <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-xs font-medium">Enviando...</span>
                </div>
              )}

              {logo && (
                <button
                  onClick={() => {
                    if (confirm("Tem certeza que quer remover a logo?")) {
                      localStorage.removeItem("padaria-logo");
                      cardapio.refresh().catch(() => {});
                      toast.success("Logo removida!");
                    }
                  }}
                  className="w-full mt-3 bg-red-50 text-red-500 px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-100 transition-all"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Background info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Imagem de fundo</h3>
        </div>

        <div className="p-5">
          {logo ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-100">
                <img
                  src={logo}
                  alt="Background"
                  className="w-full h-32 object-cover opacity-25 blur-sm"
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Usa a mesma imagem da logo com transparência e desfoque
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">
              Envie uma logo acima — ela também será usada como fundo do header
            </p>
          )}
        </div>
      </div>

      {/* Nota */}
      <p className="text-xs text-gray-400 text-center px-4">
        A logo aparece como círculo no header e como fundo com transparência. Compressão automática aplicada.
      </p>
    </div>
  );
}
