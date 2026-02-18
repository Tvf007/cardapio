import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { supabaseAdmin, BUCKET_NAME, ensureBucket } from "@/lib/supabase-admin";
import { v4 as uuid } from "uuid";

/**
 * POST /api/upload — Upload de imagem para Supabase Storage
 *
 * Recebe: FormData com campo "file" (imagem WebP/JPEG/PNG)
 * Retorna: { url: "https://...supabase.co/storage/v1/object/public/..." }
 *
 * A imagem já deve vir comprimida do frontend (WebP, ≤300KB, ≤800px)
 * O servidor apenas valida, faz upload e retorna a URL pública.
 */

// Tamanho máximo: 1MB (imagens já vêm comprimidas do frontend)
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

const ALLOWED_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

export async function POST(request: NextRequest) {
  // Verificar autenticação admin
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Garantir que o bucket existe
    const bucketReady = await ensureBucket();
    if (!bucketReady) {
      return NextResponse.json(
        {
          error: "Storage não configurado",
          details: "Adicione SUPABASE_SERVICE_ROLE_KEY ao .env.local e à Vercel para habilitar upload de imagens.",
        },
        { status: 503 }
      );
    }

    // Ler FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo não permitido: ${file.type}. Use WebP, JPEG ou PNG.` },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `Arquivo muito grande (${sizeMB}MB). Máximo: 1MB.` },
        { status: 400 }
      );
    }

    // Gerar nome único
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const fileName = `${folder}/${uuid()}.${ext}`;

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "31536000", // Cache 1 ano (imutável, nome único)
        upsert: false,
      });

    if (uploadError) {
      console.error("[Upload] Erro:", uploadError);
      return NextResponse.json(
        { error: "Erro ao fazer upload", details: uploadError.message },
        { status: 500 }
      );
    }

    // Gerar URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    console.log(`[Upload] ✅ ${fileName} (${(file.size / 1024).toFixed(0)}KB) → ${publicUrl}`);

    return NextResponse.json({
      url: publicUrl,
      fileName,
      sizeKB: Math.round(file.size / 1024),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Upload] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
