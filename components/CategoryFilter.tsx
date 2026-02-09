import { Category } from "@/lib/validation";

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
      <button
        onClick={() => onCategoryChange(null)}
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
  );
}
