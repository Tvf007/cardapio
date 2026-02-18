/**
 * Compressão de imagens no cliente (frontend)
 *
 * - Redimensiona para máximo 800px de largura (mantendo proporção)
 * - Converte para WebP (fallback para JPEG em navegadores sem suporte)
 * - Compressão progressiva até ficar abaixo de 300KB
 * - Funciona em dispositivos móveis (iPhone/Android)
 *
 * Retorna um Blob pronto para upload (NÃO base64)
 */

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  sizeKB: number;
  format: string;
}

/**
 * Verifica se o navegador suporta WebP encoding
 */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Converte canvas para Blob (compatível com Safari/iOS)
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao converter canvas para blob"));
      },
      type,
      quality
    );
  });
}

/**
 * Comprime imagem para upload
 *
 * @param file - Arquivo de imagem do input
 * @param maxWidth - Largura máxima (default: 800px)
 * @param maxSizeKB - Tamanho máximo desejado (default: 300KB)
 * @returns Blob comprimido + metadados
 */
export async function compressImageForUpload(
  file: File,
  maxWidth: number = 800,
  maxSizeKB: number = 300
): Promise<CompressedImage> {
  // Validar tipo
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido");
  }

  // Validar tamanho original (máx 10MB)
  if (file.size / (1024 * 1024) > 10) {
    throw new Error("Arquivo muito grande. Máximo 10MB.");
  }

  // Carregar imagem
  const img = await loadImage(file);

  // Calcular dimensões mantendo proporção
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  // Desenhar no canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  ctx.drawImage(img, 0, 0, width, height);

  // Determinar formato
  const useWebP = supportsWebP();
  const mimeType = useWebP ? "image/webp" : "image/jpeg";
  const extension = useWebP ? "webp" : "jpg";

  // Compressão progressiva: tenta qualidades decrescentes até ficar abaixo do limite
  const qualities = [0.85, 0.75, 0.65, 0.5, 0.4];
  let blob: Blob | null = null;
  let finalSizeKB = 0;

  for (const quality of qualities) {
    blob = await canvasToBlob(canvas, mimeType, quality);
    finalSizeKB = blob.size / 1024;

    if (finalSizeKB <= maxSizeKB) break;
  }

  if (!blob) throw new Error("Falha ao comprimir imagem");

  // Se ainda está grande, reduzir mais a resolução
  if (finalSizeKB > maxSizeKB && width > 400) {
    const smallerWidth = Math.round(width * 0.6);
    const smallerHeight = Math.round(height * 0.6);
    canvas.width = smallerWidth;
    canvas.height = smallerHeight;
    ctx.drawImage(img, 0, 0, smallerWidth, smallerHeight);

    blob = await canvasToBlob(canvas, mimeType, 0.7);
    finalSizeKB = blob.size / 1024;
    width = smallerWidth;
    height = smallerHeight;
  }

  return {
    blob,
    width,
    height,
    sizeKB: Math.round(finalSizeKB),
    format: extension,
  };
}

/**
 * Carrega um File como HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Erro ao carregar imagem. Tente outro arquivo."));
    };

    img.src = url;
  });
}
