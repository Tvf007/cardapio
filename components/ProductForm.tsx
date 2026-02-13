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

      const result = canvas.toDataURL("image/jpeg", 0.8);

      // Validar tamanho do base64 resultante (máximo 1MB)
      const base64SizeInKB = (result.length * 3) / 4 / 1024;
      if (base64SizeInKB > 1024) {
        toast.error(`Imagem muito pesada após compressão. Tente uma imagem menor ou de qualidade inferior.`);
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

    try {
      // TIMEOUT PROTECTION: Add a timeout to prevent indefinite loading
      const timeoutPromise = new Promise<void>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Operação de salvamento expirou (timeout). Por favor, tente novamente."));
        }, 20000); // 20 segundo timeout

        // Clean up timeout if operation completes successfully
        return () => clearTimeout(timeoutId);
      });

      // Race the submit operation against the timeout
      await Promise.race([
        onSubmit(formData),
        timeoutPromise,
      ]);

      // If successful, call onCancel to close form/modal
      onCancel();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao salvar produto";
      setError(errorMessage);
      console.error("[ProductForm] Erro ao salvar:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mb-8 border border-gray-200">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        {product ? "Editar Produto" : "Novo Produto"}
      </h2>

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
