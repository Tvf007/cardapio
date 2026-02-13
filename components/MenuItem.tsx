"use client";

import { memo, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { MenuItem as MenuItemType, Category } from "@/lib/validation";
import { ProductModal } from "./ProductModal";

interface MenuItemProps {
  item: MenuItemType;
  categories?: Category[];
}

function isNewProduct(item: MenuItemType): boolean {
  if (!item.created_at) return false;
  const createdDate = new Date(item.created_at);
  const diffMs = Date.now() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

const CATEGORY_COLORS = [
  '#7c4e42', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c',
];

export function getCategoryColor(categoryName: string): string {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

export function getCategoryName(categoryId: string, categories?: Category[]): string {
  if (!categories) return "N/A";
  return categories.find((c) => c.id === categoryId)?.name || "N/A";
}

// PERFORMANCE FIX: React.memo para evitar re-renders desnecessários
export const MenuItem = memo(function MenuItem({ item, categories }: MenuItemProps) {
  const [showModal, setShowModal] = useState(false);
  const isNew = isNewProduct(item);

  const categoryName = useMemo(
    () => getCategoryName(item.category, categories),
    [item.category, categories]
  );

  const categoryColor = useMemo(
    () => getCategoryColor(categoryName),
    [categoryName]
  );

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const isUnavailable = !item.available;

  return (
    <>
      <div
        className="menu-card menu-card-mobile group bg-white shadow-sm overflow-hidden border border-gray-100"
        onClick={handleOpenModal}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalhes de ${item.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenModal();
          }
        }}
        style={{ opacity: isUnavailable ? 0.6 : 1 }}
      >
        {/* Imagem */}
        <div className="card-image-mobile relative bg-gradient-to-br from-amber-50 to-orange-50 flex-shrink-0 overflow-hidden">
          {item.image && item.image.trim() !== "" ? (
            <Image
              src={item.image}
              alt={item.name}
              width={200}
              height={200}
              className="menu-card-image w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23fef3c7' width='200' height='200'/%3E%3C/svg%3E"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-amber-300">
              <span className="text-4xl sm:text-5xl">🥐</span>
            </div>
          )}

          {/* Badge Indisponível - só mostra quando indisponível */}
          {isUnavailable && (
            <span className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-md bg-red-500">
              Indisponível
            </span>
          )}

          {/* Badge Novo */}
          {isNew && !isUnavailable && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
              <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-md bg-gradient-to-r from-amber-500 to-orange-500">
                Novo
              </span>
            </div>
          )}

          {/* Preço no card desktop (sobre a imagem) */}
          <div className="hidden sm:block absolute bottom-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm shadow-lg px-3 py-1.5 rounded-xl">
              <span className="font-extrabold text-[#7c4e42] text-base">
                R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="card-content-mobile">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-1 sm:line-clamp-2 mb-0.5 sm:mb-1">
            {item.name}
          </h3>

          {item.description && (
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 sm:line-clamp-2 leading-snug mb-1.5 sm:mb-3">
              {item.description}
            </p>
          )}

          {/* Preço mobile - inline */}
          <div className="sm:hidden">
            <span className="font-extrabold text-[#7c4e42] text-base">
              R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
            </span>
          </div>

          {/* Footer do card desktop */}
          <div className="hidden sm:flex mt-auto items-center justify-between">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{
                backgroundColor: `${categoryColor}10`,
                color: categoryColor,
                borderColor: `${categoryColor}30`
              }}
            >
              {categoryName}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-[#7c4e42] transition-colors">
              Ver mais →
            </span>
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {showModal && (
        <ProductModal
          item={item}
          categories={categories}
          categoryName={categoryName}
          categoryColor={categoryColor}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
});
