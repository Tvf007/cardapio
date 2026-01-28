"use client";

import { MenuItem } from "@/lib/validation";
import { useState } from "react";
import { RippleButton } from "./RippleButton";

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
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<MenuItem>(
    product || {
      id: Date.now().toString(),
      name: "",
      description: "",
      price: 0,
      category: categories[0]?.id || "1",
      available: true,
      image: "",
    }
  );

  const [imagePreview, setImagePreview] = useState<string>(formData.image || "");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {product ? "Editar Produto" : "Novo Produto"}
      </h2>

      {/* Image Preview and Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foto do Produto
        </label>
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-all duration-300" style={{ '--hover-border': '#7c4e42' } as any} onMouseEnter={(e) => {
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
                  className="w-full h-40 object-cover rounded-md"
                />
                <RippleButton
                  type="button"
                  onClick={() => {
                    setImagePreview("");
                    setFormData({ ...formData, image: "" });
                  }}
                  className="absolute top-1 right-1 bg-gray-700 hover:bg-gray-800 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors text-sm"
                >
                  ✕
                </RippleButton>
              </div>
            ) : (
              <div className="py-6">
                <p className="text-3xl mb-2">📸</p>
                <p className="text-gray-700 text-sm font-medium">Clique para adicionar uma foto</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Frango à Parmegiana"
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Preço (R$)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-sm pointer-events-none z-10">R$</span>
            <input
              type="number"
              step="0.01"
              value={formData.price || ""}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined as any })
              }
              placeholder="0,00"
              className="w-full pl-12 pr-3.5 py-2.5 border border-gray-300 rounded-md transition-all duration-200 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
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
      </div>

      {/* Category and Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Categoria
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
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
          className="flex-1 text-white py-2.5 rounded-md font-medium transition-all duration-200 text-sm"
          style={{
            backgroundColor: '#7c4e42',
            boxShadow: '0 4px 12px rgba(124, 78, 66, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a3a2f';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 78, 66, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#7c4e42';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 78, 66, 0.2)';
          }}
        >
          {product ? "Atualizar" : "Criar"} Produto
        </RippleButton>
        <RippleButton
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-md font-medium transition-colors duration-200 text-sm"
        >
          Cancelar
        </RippleButton>
      </div>
    </form>
  );
}
