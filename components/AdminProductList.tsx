"use client";

import { MenuItem } from "@/lib/validation";

interface AdminProductListProps {
  products: MenuItem[];
  categories: Array<{ id: string; name: string }>;
  onEdit: (product: MenuItem) => void;
  onDelete: (id: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function AdminProductList({
  products,
  categories,
  onEdit,
  onDelete,
  isLoading = false,
}: AdminProductListProps) {
  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "N/A";
  };

  // Skeleton Loading Component
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse"
          >
            <div className="w-full h-40 bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="flex gap-3 pt-2">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
                <div className="w-12 h-10 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum produto cadastrado
        </p>
        <p className="text-gray-600 text-center">
          Comece adicionando seus produtos através do formulário.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col"
        >
          {/* Image Section */}
          <div className="relative w-full h-40 bg-gray-100 flex-shrink-0 overflow-hidden">
            {product.image && product.image.trim() !== "" ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl">🍽️</span>
                  <span className="text-xs text-gray-400">Sem imagem</span>
                </div>
              </div>
            )}

            {/* Availability Badge - Top Right */}
            <span
              className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                product.available ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {product.available ? "Disponível" : "Indisponível"}
            </span>
          </div>

          {/* Content Section */}
          <div className="p-5 flex flex-col flex-1">
            {/* Category Badge */}
            <span
              className="inline-block self-start px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{
                backgroundColor: "#f3ece9",
                color: "#7c4e42",
              }}
            >
              {getCategoryName(product.category)}
            </span>

            {/* Product Name */}
            <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">
              {product.name}
            </h3>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Price */}
            <p
              className="text-xl font-extrabold mt-auto mb-4"
              style={{ color: "#7c4e42" }}
            >
              R$ {typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onEdit(product)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "#7c4e42" }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Editar
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Tem certeza que deseja deletar "${product.name}"?`
                    )
                  ) {
                    onDelete(product.id);
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
