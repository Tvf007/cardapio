"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${item.name}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" />

      {/* Modal */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-modalSlideUp">
        {/* Barra colorida */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${categoryColor}, ${categoryColor}aa)` }}
        />

        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors duration-200 shadow-lg"
          aria-label="Fechar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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

        {/* Imagem */}
        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
          {item.image && item.image.trim() !== "" ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23fef3c7' width='400' height='300'/%3E%3C/svg%3E"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-amber-300">
              <span className="text-7xl mb-2">🥐</span>
            </div>
          )}

          {/* Badge indisponível */}
          {!item.available && (
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md bg-red-500">
              Indisponível
            </span>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[40vh]">
          {/* Categoria */}
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-3"
            style={{
              backgroundColor: `${categoryColor}10`,
              color: categoryColor,
              borderColor: `${categoryColor}30`,
            }}
          >
            {categoryName}
          </span>

          {/* Nome */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {item.name}
          </h2>

          {/* Descrição completa */}
          {item.description && (
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 whitespace-pre-line">
              {item.description}
            </p>
          )}

          {/* Preço */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Preço</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#7c4e42]">
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
