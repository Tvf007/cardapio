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
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Preço</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#7c4e42] dark:text-amber-400">
              R${" "}
              {typeof item.price === "number"
                ? item.price.toFixed(2)
                : "0.00"}
            </span>
          </div>

          {/* Botão WhatsApp */}
          <button
            onClick={() => {
              const price = typeof item.price === "number" ? item.price.toFixed(2) : "0.00";
              const message = `Olá! Gostaria de pedir:\n\n${item.name}\nPreço: R$ ${price}`;
              const whatsappUrl = `https://wa.me/5527997835980?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, "_blank");
            }}
            className="w-full py-3 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.769c0 2.589.875 5.022 2.472 6.923l-2.598 9.556 9.786-3.14c1.999 1.158 4.334 1.809 6.784 1.809h.007c5.396 0 9.767-4.413 9.767-9.859 0-2.637-.875-5.061-2.472-6.966 1.6-1.905 2.472-4.329 2.472-6.966C21.52 6.413 17.15 2 11.77 2Z" />
            </svg>
            <span>Pedir pelo WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
