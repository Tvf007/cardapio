import { memo } from "react";
import { MenuItem as MenuItemType, Category } from "@/lib/validation";
import { MenuItem } from "./MenuItem";

interface MenuGridProps {
  items: MenuItemType[];
  categories?: Category[];
}

// PERFORMANCE FIX: React.memo para evitar re-render do grid inteiro
export const MenuGrid = memo(function MenuGrid({ items, categories }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Nenhum item encontrado nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
      {items.map((item) => (
        <MenuItem key={item.id} item={item} categories={categories} />
      ))}
    </div>
  );
});
