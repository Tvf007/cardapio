"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { Category } from "@/lib/validation";

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

// PERFORMANCE FIX: React.memo para evitar re-renders desnecessarios
export const CategoryFilter = memo(function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const handleAll = useCallback(() => onCategoryChange(null), [onCategoryChange]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Verificar se tem scroll e atualizar indicadores
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
    // Re-check on resize
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
        <div className="absolute left-0 top-0 bottom-4 w-10 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none" />
      )}

      {/* Gradiente fade direita */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-4 w-10 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide"
      >
        <button
          onClick={handleAll}
          className={`category-btn px-6 py-3 rounded-full font-semibold whitespace-nowrap flex-shrink-0 border-2 shadow-sm text-sm ${
            activeCategory === null
              ? "active bg-[#7c4e42] border-[#7c4e42] text-white shadow-lg"
              : "bg-white border-gray-200 text-gray-700 hover:border-[#a67c5a] hover:bg-amber-50"
          }`}
        >
          Todos
        </button>
        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`category-btn px-6 py-3 rounded-full font-semibold whitespace-nowrap flex-shrink-0 border-2 shadow-sm text-sm ${
                isActive
                  ? "active bg-[#7c4e42] border-[#7c4e42] text-white shadow-lg"
                  : "bg-white border-gray-200 text-gray-700 hover:border-[#a67c5a] hover:bg-amber-50"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
});
