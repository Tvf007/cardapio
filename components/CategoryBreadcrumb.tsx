"use client";

import { Category } from "@/lib/validation";

interface CategoryBreadcrumbProps {
  categories?: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryBreadcrumb({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryBreadcrumbProps) {
  const activeCategoryName = activeCategory
    ? categories?.find((c) => c.id === activeCategory)?.name
    : null;

  return (
    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-1 overflow-x-auto">
      <span>Padaria Freitas</span>
      <span>/</span>
      <span>Cardápio</span>
      {activeCategoryName && (
        <>
          <span>/</span>
          <span className="font-semibold text-[#7c4e42] dark:text-amber-400">
            {activeCategoryName}
          </span>
        </>
      )}
      {activeCategoryName && (
        <button
          onClick={() => onCategoryChange(null)}
          className="ml-auto text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap font-medium transition-colors"
        >
          Ver tudo →
        </button>
      )}
    </div>
  );
}
