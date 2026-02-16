"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { Category } from "@/lib/validation";

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

// Emojis por categoria (baseado no nome)
function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("pão") || lower.includes("pao") || lower.includes("paes") || lower.includes("pães")) return "🍞";
  if (lower.includes("bolo") || lower.includes("torta")) return "🎂";
  if (lower.includes("doce") || lower.includes("sobremesa") || lower.includes("confeit")) return "🍰";
  if (lower.includes("salgado") || lower.includes("lanche") || lower.includes("sanduíche") || lower.includes("sanduiche")) return "🥪";
  if (lower.includes("bebida") || lower.includes("suco") || lower.includes("refrigerante")) return "🥤";
  if (lower.includes("café") || lower.includes("cafe")) return "☕";
  if (lower.includes("pizza")) return "🍕";
  if (lower.includes("porção") || lower.includes("porcao") || lower.includes("porções")) return "🍟";
  if (lower.includes("açaí") || lower.includes("acai")) return "🫐";
  if (lower.includes("sorvete") || lower.includes("gelado")) return "🍦";
  if (lower.includes("fruta")) return "🍓";
  if (lower.includes("fit") || lower.includes("salada") || lower.includes("integral")) return "🥗";
  if (lower.includes("promoção") || lower.includes("promocao") || lower.includes("destaque") || lower.includes("oferta")) return "⭐";
  return "🍽️";
}

// PERFORMANCE FIX: React.memo para evitar re-renders desnecessários
export const CategoryFilter = memo(function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const handleAll = useCallback(() => onCategoryChange(null), [onCategoryChange]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const hasScrollLeft = el.scrollLeft > 5;
    const hasScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 5;

    setShowLeftFade(hasScrollLeft);
    setShowRightFade(hasScrollRight);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      observer.disconnect();
    };
  }, [checkScroll, categories]);

  return (
    <div className="relative">
      {/* Gradiente fade esquerda */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#fdf6ee] to-transparent z-10 pointer-events-none" />
      )}

      {/* Gradiente fade direita */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#fdf6ee] to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide"
      >
        {/* Botão "Todos" */}
        <button
          onClick={handleAll}
          className={`category-chip flex-shrink-0 ${
            activeCategory === null ? "category-chip-active" : "category-chip-inactive"
          }`}
        >
          <span className="category-chip-emoji">🏠</span>
          <span>Todos</span>
        </button>

        {/* Botões de cada categoria */}
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          const emoji = getCategoryEmoji(category.name);
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`category-chip flex-shrink-0 ${
                isActive ? "category-chip-active" : "category-chip-inactive"
              }`}
            >
              <span className="category-chip-emoji">{emoji}</span>
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
