"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { Category } from "@/lib/validation";

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
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
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fdf6ee] to-transparent z-10 pointer-events-none" />
      )}

      {/* Gradiente fade direita */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#fdf6ee] to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        <button
          onClick={handleAll}
          className={`category-btn px-5 py-2.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 text-sm transition-all ${
            activeCategory === null
              ? "active bg-[#7c4e42] text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-amber-50 border border-gray-200 hover:border-[#d4a574]"
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
              className={`category-btn px-5 py-2.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 text-sm transition-all ${
                isActive
                  ? "active bg-[#7c4e42] text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-amber-50 border border-gray-200 hover:border-[#d4a574]"
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
