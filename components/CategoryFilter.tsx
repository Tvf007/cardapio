import { Category } from "@/types";
import { RippleButton } from "./RippleButton";

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
  const allButton = activeCategory === null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
      <RippleButton
        onClick={() => onCategoryChange(null)}
        className="px-6 py-3 rounded-full font-heading font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 border-2 text-white shadow-lg relative overflow-hidden gpu-accelerate"
        style={{
          backgroundColor: allButton ? '#7c4e42' : 'white',
          borderColor: allButton ? '#7c4e42' : '#e5e7eb',
          color: allButton ? 'white' : '#374151',
        }}
        onMouseEnter={(e) => {
          if (!allButton) {
            e.currentTarget.style.borderColor = '#a67c5a';
            e.currentTarget.style.backgroundColor = '#faf5f0';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(124, 78, 66, 0.2)';
          } else {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 78, 66, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!allButton) {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          } else {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }
        }}
      >
        Todos
      </RippleButton>
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <RippleButton
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className="px-6 py-3 rounded-full font-heading font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 border-2 relative overflow-hidden gpu-accelerate"
            style={{
              backgroundColor: isActive ? '#7c4e42' : 'white',
              borderColor: isActive ? '#7c4e42' : '#e5e7eb',
              color: isActive ? 'white' : '#374151',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#a67c5a';
                e.currentTarget.style.backgroundColor = '#faf5f0';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(124, 78, 66, 0.2)';
              } else {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(124, 78, 66, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              } else {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {category.name}
          </RippleButton>
        );
      })}
    </div>
  );
}
