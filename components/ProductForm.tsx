"use client";

import { MenuItem } from "@/lib/validation";
import { useState } from "react";
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
      category: categories[0]?.id || "1",
      available: true,
      image: "",
    }
  );

  const [imagePreview, setImagePreview] = useState<string>(formData.image || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = externalLoading || isSubmitting;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho máximo de 5MB
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        alert("Imagem muito grande! Máximo permitido é 5MB");
        return;
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione um arquivo de imagem válido");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData({ ...formData, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validacao basica no frontend
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

    // Check for duplicate product name in the same category
    const duplicateProduct = cardapio.products.find(
      (p) =>
        p.category === formData.category &&
        p.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        p.id !== formData.id
    );

    if (duplicateProduct) {
      toast.error("Produto com este nome já existe nesta categoria!");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-8 border border-gray-200">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
        {product ? "Editar Produto" : "Novo Produto"}
      </h2>

      {/* Error Message */}
      {error && (
        <div className="mb-3 sm:mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-xs sm:text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Image Preview and Upload */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
          Foto do Produto
        </label>
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center transition-all duration-300" style={{ '--hover-border': '#7c4e42' } as any} onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#7c4e42';
            e.currentTarget.style.backgroundColor = '#f5eee5';
          }} onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}>
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
                    setFormData({ ...formData, image: "" });
                  }}
                  className="absolute top-1 right-1 bg-gray-700 hover:bg-gray-800 text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center transition-colors text-xs sm:text-sm"
                >
                  ✕
                </RippleButton>
              </div>
            ) : (
              <div className="py-4 sm:py-6">
                <p className="text-2xl sm:text-3xl mb-2">📸</p>
                <p className="text-gray-700 text-xs sm:text-sm font-medium">Clique para adicionar uma foto</p>
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
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Frango à Parmegiana"
            className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-xs sm:text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
            onFocus={(e) => {
              e.target.style.borderColor = '#7c4e42';
              e.target.style.boxShadow = '0 0 0 3px rgba(124, 78, 66, 0.15)';
              e.target.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
              e.target.style.animation = 'none';
            }}
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
            Preço (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price || ""}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : 0 })
            }
            placeholder="0,00"
            className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-xs sm:text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
            onFocus={(e) => {
              e.target.style.borderColor = '#7c4e42';
              e.target.style.boxShadow = '0 0 0 3px rgba(124, 78, 66, 0.15)';
              e.target.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
              e.target.style.animation = 'none';
            }}
          />
        </div>
      </div>

      {/* Category and Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-xs sm:text-sm bg-white text-gray-900 focus:outline-none"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c4e42';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 78, 66, 0.15)';
              e.currentTarget.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.animation = 'none';
            }}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Disponibilidade
          </label>
          <select
            value={formData.available ? "true" : "false"}
            onChange={(e) =>
              setFormData({ ...formData, available: e.target.value === "true" })
            }
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-sm bg-white text-gray-900 focus:outline-none"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#7c4e42';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 78, 66, 0.15)';
              e.currentTarget.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.animation = 'none';
            }}
          >
            <option value="true">Disponível</option>
            <option value="false">Indisponível</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Descrição
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Descreva o produto aqui..."
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md transition-all duration-200 resize-none text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
          rows={3}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#7c4e42';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 78, 66, 0.15)';
            e.currentTarget.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.animation = 'none';
          }}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <RippleButton
          type="submit"
          disabled={isLoading}
          className={`flex-1 text-white py-2.5 rounded-md font-medium transition-all duration-200 text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          style={{
            backgroundColor: isLoading ? '#9a7a70' : '#7c4e42',
            boxShadow: '0 4px 12px rgba(124, 78, 66, 0.2)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#5a3a2f';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 78, 66, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#7c4e42';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 78, 66, 0.2)';
            }
          }}
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
          className={`flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-md font-medium transition-colors duration-200 text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          Cancelar
        </RippleButton>
      </div>
    </form>
  );
}
