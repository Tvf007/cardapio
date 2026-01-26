"use client";

import { MenuItem } from "@/types";

interface AdminProductListProps {
  products: MenuItem[];
  categories: Array<{ id: string; name: string }>;
  onEdit: (product: MenuItem) => void;
  onDelete: (id: string) => void;
}

export function AdminProductList({
  products,
  categories,
  onEdit,
  onDelete,
}: AdminProductListProps) {
  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "N/A";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Categoria</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Preço</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{getCategoryName(product.category)}</td>
              <td className="px-6 py-4 text-sm font-semibold text-green-600">R$ {product.price.toFixed(2)}</td>
              <td className="px-6 py-3 text-sm">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    product.available
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.available ? "Disponível" : "Indisponível"}
                </span>
              </td>
              <td className="px-6 py-3 text-sm">
                <button
                  onClick={() => onEdit(product)}
                  className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Deletar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
