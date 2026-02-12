"use client";

import { useEffect, useCallback } from "react";
import { MenuItem, Category } from "@/lib/validation";

interface ProductModalProps {
  item: MenuItem;
  categories?: Category[];
  categoryName: string;
  categoryColor: string;
  onClose: () => void;
}

export function ProductModal({
  item,
  categoryName,
  categoryColor,
  onClose,
}: ProductModalProps) {
  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Bloquear scroll do body
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  // Fechar ao clicar no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${item.name}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-modalSlideUp">
        {/* Barra colorida da categoria no topo */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Botao fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors duration-200 shadow-lg"
          aria-label="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Imagem ampliada */}
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {item.image && item.image.trim() !== "" ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-contain bg-white"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-7xl mb-2">&#127869;</span>
              <span className="text-sm font-medium">Sem imagem</span>
            </div>
          )}

          {/* Badge de disponibilidade */}
          <span
            className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md ${
              item.available ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {item.available ? "Disponivel" : "Indisponivel"}
          </span>
        </div>

        {/* Conteudo com scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[40vh]">
          {/* Categoria */}
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-3"
            style={{
              backgroundColor: `${categoryColor}15`,
              color: categoryColor,
              borderColor: categoryColor,
            }}
          >
            {categoryName}
          </span>

          {/* Nome */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {item.name}
          </h2>

          {/* Descricao completa */}
          {item.description && (
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 whitespace-pre-line">
              {item.description}
            </p>
          )}

          {/* Preco */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Preco</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-green-600">
              R${" "}
              {typeof item.price === "number"
                ? item.price.toFixed(2)
                : "0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
