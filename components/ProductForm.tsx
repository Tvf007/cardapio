"use client";

import { MenuItem } from "@/lib/validation";
import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import { RippleButton } from "./RippleButton";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";

interface ProductFormProps {
  product?: MenuItem;
  categories: Array<{ id: string; name: string }>;
  onSubmit: (product: MenuItem) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isLoading: externalLoading = false,
}: ProductFormProps) {
  const cardapio = useCardapio();
  const toast = useToast();

  const [formData, setFormData] = useState<MenuItem>(
    product || {
      id: uuid(),
      name: "",
      description: "",
      price: 0,
      category: categories[0]?.id || "",
      available: true,
      image: "",
    }
  );

  const [imagePreview, setImagePreview] = useState<string>(formData.image || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    status: "uploading" | "validating" | "saving" | "success" | "error";
    message: string;
    percentage: number;
  } | null>(null);

  const isLoading = externalLoading || isSubmitting;

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem valido");
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    const maxFileSizeMB = 5;
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSizeMB) {
      toast.error(`Arquivo muito grande. Máximo ${maxFileSizeMB}MB. Seu arquivo: ${fileSizeInMB.toFixed(2)}MB`);
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

      // Qualidade de 0.9 para melhor resultado visual com imagens de alimentos
      const result = canvas.toDataURL("image/jpeg", 0.9);

      // Validar tamanho do base64 resultante (máximo 700KB, alinhado com backend)
      const base64SizeInKB = (result.length * 3) / 4 / 1024;
      if (base64SizeInKB > 700) {
        toast.error(`Imagem muito pesada (${base64SizeInKB.toFixed(0)}KB). Máximo: 700KB. Tente uma imagem menor ou de qualidade inferior.`);
        return;
      }

      setImagePreview(result);
      setFormData((prev) => ({ ...prev, image: result }));
    };

    img.onerror = () => {
      toast.error("Erro ao carregar a imagem. Tente outra arquivo");
    };

    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Nome do produto e obrigatorio");
      return;
    }

    if (formData.price < 0) {
      setError("Preco deve ser maior ou igual a zero");
      return;
    }

    if (!formData.category) {
      setError("Selecione uma categoria");
      return;
    }

    const duplicateProduct = cardapio.products.find(
      (p) =>
        p.category === formData.category &&
        p.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        p.id !== formData.id
    );

    if (duplicateProduct) {
      toast.error("Produto com este nome ja existe nesta categoria!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Iniciar progress
    setUploadProgress({
      status: "uploading",
      message: "Preparando upload...",
      percentage: 0,
    });

    try {
      // Progresso: Validação
      setTimeout(() => {
        if (uploadProgress?.status !== "success") {
          setUploadProgress({
            status: "validating",
            message: `Validando dados do produto "${formData.name}"...`,
            percentage: 25,
          });
        }
      }, 500);

      // Progresso: Salvamento
      setTimeout(() => {
        if (uploadProgress?.status !== "success") {
          setUploadProgress({
            status: "saving",
            message: `Sincronizando com servidor...`,
            percentage: 60,
          });
        }
      }, 2000);

      // Executar submit
      await onSubmit(formData);

      // Progresso: Sucesso
      setUploadProgress({
        status: "success",
        message: "Produto salvo com sucesso! 🎉",
        percentage: 100,
      });

      // Esperar um pouco para usuário ver a mensagem de sucesso
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Fechar formulário
      onCancel();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao salvar produto";

      // Mostrar erro no progress bar e na área de erro
      setUploadProgress({
        status: "error",
        message: `Erro: ${errorMessage}`,
        percentage: 0,
      });

      setError(errorMessage);
      console.error("[ProductForm] Erro ao salvar:", err);

      // Limpar progress bar após 5 segundos
      setTimeout(() => {
        setUploadProgress(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8 border border-gray-200">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        {product ? "Editar Produto" : "Novo Produto"}
      </h2>

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            uploadProgress.status === "error"
              ? "bg-red-50 border-red-200"
              : uploadProgress.status === "success"
              ? "bg-green-50 border-green-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className={`text-sm sm:text-base font-medium ${
                uploadProgress.status === "error"
                  ? "text-red-700"
                  : uploadProgress.status === "success"
                  ? "text-green-700"
                  : "text-blue-700"
              }`}
            >
              {uploadProgress.message}
            </p>
            {uploadProgress.status !== "error" && uploadProgress.status !== "success" && (
              <span className="text-xs sm:text-sm font-semibold text-blue-600">
                {uploadProgress.percentage}%
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {uploadProgress.status !== "error" && uploadProgress.status !== "success" && (
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
          )}

          {/* Success Checkmark */}
          {uploadProgress.status === "success" && (
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full w-full" />
              </div>
            </div>
          )}

          {/* Error Icon */}
          {uploadProgress.status === "error" && (
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full w-full" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm sm:text-base font-medium">{error}</p>
        </div>
      )}

      {/* Image Upload */}
      <div className="mb-8">
        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-3">
          Foto do Produto
        </label>
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-[#7c4e42] hover:bg-amber-50/50 transition-colors">
            {imagePreview ? (
              <div className="relative inline-block w-full">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-32 sm:h-40 object-cover rounded-md"
                />
                <RippleButton
                  type="button"
                  onClick={() => {
                    setImagePreview("");
                    setFormData((prev) => ({ ...prev, image: "" }));
                  }}
                  className="absolute top-1 right-1 bg-gray-700 hover:bg-gray-800 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-sm sm:text-base"
                >
                  X
                </RippleButton>
              </div>
            ) : (
              <div className="py-4 sm:py-6">
                <p className="text-2xl sm:text-3xl mb-2">&#128248;</p>
                <p className="text-gray-700 text-sm sm:text-base font-medium">Clique para adicionar uma foto</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Name and Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
            Nome
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Frango a Parmegiana"
            className="form-input w-full px-4 py-3 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base bg-white text-gray-900 placeholder-gray-400 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
            Preço (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price || ""}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : 0 })
            }
            placeholder="0,00"
            className="form-input w-full px-4 py-3 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base bg-white text-gray-900 placeholder-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Category and Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="form-input w-full px-4 py-3 border border-gray-300 rounded-md text-sm sm:text-base bg-white text-gray-900 transition-all"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
            Disponibilidade
          </label>
          <select
            value={formData.available ? "true" : "false"}
            onChange={(e) =>
              setFormData({ ...formData, available: e.target.value === "true" })
            }
            className="form-input w-full px-4 py-3 border border-gray-300 rounded-md text-sm sm:text-base bg-white text-gray-900 transition-all"
          >
            <option value="true">Disponível</option>
            <option value="false">Indisponível</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="mb-8">
        <label className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
          Descrição
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Descreva o produto aqui..."
          className="form-input w-full px-4 py-3 border border-gray-300 rounded-md resize-none text-sm sm:text-base bg-white text-gray-900 placeholder-gray-400 transition-all"
          rows={4}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <RippleButton
          type="submit"
          disabled={isLoading}
          className={`btn-primary flex-1 text-white py-3 rounded-md font-semibold text-base ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Salvando...
            </span>
          ) : (
            <>{product ? "Atualizar" : "Criar"} Produto</>
          )}
        </RippleButton>
        <RippleButton
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-md font-semibold text-base transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          Cancelar
        </RippleButton>
      </div>
    </form>
  );
}
