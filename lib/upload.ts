/**
 * Helper para upload de imagens no frontend
 *
 * Fluxo:
 * 1. Comprime imagem (WebP, ≤800px, ≤300KB) via lib/image-compress.ts
 * 2. Envia para /api/upload (FormData)
 * 3. Retorna URL pública do Supabase Storage
 *
 * Se o Storage não estiver configurado, faz fallback para base64
 * (para manter compatibilidade durante a migração)
 */

import { compressImageForUpload } from "./image-compress";

export interface UploadResult {
  url: string;
  sizeKB: number;
  isBase64: boolean;
}

/**
 * Faz upload de uma imagem
 * Tenta Supabase Storage primeiro, fallback para base64
 */
export async function uploadImage(
  file: File,
  folder: string = "products"
): Promise<UploadResult> {
  // Comprimir imagem (WebP, ≤800px, ≤300KB)
  const compressed = await compressImageForUpload(file, 800, 300);

  // Tentar upload para Supabase Storage
  try {
    const formData = new FormData();
    const fileName = `image.${compressed.format}`;
    const compressedFile = new File([compressed.blob], fileName, {
      type: compressed.blob.type,
    });
    formData.append("file", compressedFile);
    formData.append("folder", folder);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return {
        url: data.url,
        sizeKB: compressed.sizeKB,
        isBase64: false,
      };
    }

    // Se Storage não configurado (503), usar fallback base64
    const errorData = await response.json().catch(() => ({}));
    console.warn("[Upload] Storage indisponível, usando base64:", errorData.error || response.status);
  } catch (err) {
    console.warn("[Upload] Erro no upload, usando base64 fallback:", err);
  }

  // Fallback: converter para base64 (compatibilidade)
  const base64 = await blobToBase64(compressed.blob);
  return {
    url: base64,
    sizeKB: compressed.sizeKB,
    isBase64: true,
  };
}

/**
 * Converte Blob para base64 data URI (fallback)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao converter para base64"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Verifica se uma URL é base64 ou URL externa
 */
export function isBase64Image(url: string): boolean {
  return url.startsWith("data:");
}
