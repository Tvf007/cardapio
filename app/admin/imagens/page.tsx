"use client";

import { useRef, useCallback, useState } from "react";
import { RippleButton } from "@/components/RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validar tipo
    if (!file.type.startsWith("image/")) {
      reject(new Error("Por favor, selecione um arquivo de imagem válido"));
      return;
    }

    // Validar tamanho do arquivo original (máximo 10MB - fotos de iPhone/Android)
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

      // Compressão progressiva: tentar quality 0.8, se ainda grande tentar 0.6
      let result = canvas.toDataURL("image/jpeg", 0.8);
      let base64SizeInKB = (result.length * 3) / 4 / 1024;

      if (base64SizeInKB > 1500) {
        // Tentar com qualidade menor
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

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    // Validar tamanho do arquivo original (máximo 10MB - fotos de iPhone podem ter até 8MB)
    const maxFileSizeMB = 10;
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSizeMB) {
      toast.error(
        `Arquivo muito grande (${fileSizeInMB.toFixed(1)}MB). ` +
        `Máximo permitido: ${maxFileSizeMB}MB.`
      );
      return;
    }

    setUploadingLogo(true);
    try {
      // Comprimir imagem automaticamente (resize + JPEG)
      // Fotos de iPhone (3-8MB) ficam ~100-400KB após compressão
      const compressedResult = await compressImage(file);

      // Validar tamanho final após compressão
      const base64SizeKB = (compressedResult.length * 3) / 4 / 1024;
      if (base64SizeKB > 1500) {
        toast.error(
          `Imagem ainda muito grande após compressão (${base64SizeKB.toFixed(0)}KB). ` +
          `Máximo: 1500KB. Tente uma imagem com menos detalhes.`
        );
        return;
      }

      // Salvar em localStorage
      try {
        localStorage.setItem("padaria-logo", compressedResult);
      } catch (err) {
        toast.error("Erro ao salvar logo localmente. Tente novamente.");
        return;
      }

      // Salvar no servidor
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
          toast.error(`Erro ao sincronizar logo: ${errorMsg}`);
          return;
        }

        // Atualizar contexto
        try {
          await cardapio.refresh();
        } catch (refreshError) {
          console.warn("Erro ao atualizar contexto:", refreshError);
        }

        toast.success("Logo atualizado com sucesso!");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(`Erro ao sincronizar logo: ${errorMsg}. Salvo localmente.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar imagem");
    } finally {
      setUploadingLogo(false);
      // Reset input
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  }, [cardapio, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Imagens do Cardápio</h2>
        <p className="text-gray-600">Customize com suas próprias imagens</p>
      </div>

      {/* Seção 1: Logo Redonda */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🎨 Logo Redonda</h3>
        <p className="text-sm text-gray-600 mb-6">
          Esta imagem aparece no header do seu cardápio como um círculo e também no QR Code.
        </p>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 shadow-md flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl">🍞</span>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center">
              {logo ? "Logo atual" : "Padrão"}
            </p>
          </div>

          {/* Upload */}
          <div className="flex-1">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => logoInputRef.current?.click()}
            >
              <p className="text-2xl mb-2">📤</p>
              <h4 className="font-bold text-gray-900 mb-1">Clique ou arraste uma imagem</h4>
              <p className="text-sm text-gray-600 mb-4">Aceita fotos do celular (até 10MB) - compressão automática</p>
              <p className="text-xs text-gray-500">
                Suportados: JPG, PNG, GIF, WebP
              </p>
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
              <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm">Enviando...</span>
              </div>
            )}

            {logo && (
              <div className="mt-4">
                <RippleButton
                  onClick={() => {
                    if (confirm("Tem certeza que quer remover a logo?")) {
                      localStorage.removeItem("padaria-logo");
                      cardapio.refresh().catch(() => {});
                      toast.success("Logo removida!");
                    }
                  }}
                  className="w-full bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-all"
                >
                  🗑️ Remover Logo
                </RippleButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção 2: Imagem de Fundo */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🖼️ Imagem de Fundo</h3>
        <p className="text-sm text-gray-600 mb-6">
          Esta imagem aparece como background suave no header do seu cardápio.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700">
            💡 <strong>Nota:</strong> Atualmente, a imagem de fundo usa a mesma logo que você subiu acima. Ambas utilizam a mesma imagem por enquanto.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-600 text-sm">Será usada a mesma imagem da logo redonda</p>
          {logo && (
            <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 shadow-md">
              <img
                src={logo}
                alt="Background Preview"
                className="w-full h-48 object-cover opacity-30 blur-sm"
              />
            </div>
          )}
          <p className="text-xs text-gray-500 text-center max-w-md">
            A imagem aparece no background com transparência (25% opacidade) e desfoque (blur) para não prejudicar a legibilidade.
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h4 className="font-bold text-gray-900 mb-3">ℹ️ Orientações</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ A imagem deve ser quadrada ou próxima disso (não será esticada)</li>
          <li>✓ Use uma imagem de alta qualidade para melhor resultado</li>
          <li>✓ A imagem será redimensionada automaticamente (máx 1200x1200px)</li>
          <li>✓ Será comprimida em JPEG automaticamente para otimização</li>
          <li>✓ Aceita fotos direto do celular (iPhone/Android) até 10MB</li>
          <li>✓ Aparece como um círculo no header e como background suave</li>
        </ul>
      </div>
    </div>
  );
}
