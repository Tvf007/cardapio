import { memo, useMemo } from "react";
import { MenuItem as MenuItemType, Category } from "@/lib/validation";
import { MenuItem, getCategoryColor, getCategoryName } from "./MenuItem";

interface MenuGridProps {
  items: MenuItemType[];
  categories?: Category[];
  showCategoryDividers?: boolean;
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

// PERFORMANCE FIX: React.memo para evitar re-render do grid inteiro
export const MenuGrid = memo(function MenuGrid({ items, categories, showCategoryDividers = false }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-3">🔍</span>
        <p className="text-gray-400 text-base">Nenhum item encontrado nesta categoria.</p>
      </div>
    );
  }

  // Se não tem separadores, renderizar grid normal
  if (!showCategoryDividers || !categories) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 animate-stagger">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} categories={categories} />
        ))}
      </div>
    );
  }

  // Agrupar itens por categoria, mantendo a ordem das categorias
  const groupedItems = useMemo(() => {
    const groups: { category: Category; items: MenuItemType[] }[] = [];
    const categoryMap = new Map<string, MenuItemType[]>();

    // Agrupar por category ID
    items.forEach((item) => {
      const existing = categoryMap.get(item.category);
      if (existing) {
        existing.push(item);
      } else {
        categoryMap.set(item.category, [item]);
      }
    });

    // Ordenar pelos categories na ordem original
    categories.forEach((cat) => {
      const catItems = categoryMap.get(cat.id);
      if (catItems && catItems.length > 0) {
        groups.push({ category: cat, items: catItems });
      }
    });

    // Adicionar categorias que não estão na lista de categorias (edge case)
    categoryMap.forEach((catItems, catId) => {
      if (!categories.find((c) => c.id === catId)) {
        groups.push({
          category: { id: catId, name: catId, order: 999 },
          items: catItems,
        });
      }
    });

    return groups;
  }, [items, categories]);

  return (
    <div className="space-y-2">
      {groupedItems.map((group) => {
        const color = getCategoryColor(group.category.name);
        const emoji = getCategoryEmoji(group.category.name);

        return (
          <div key={group.category.id}>
            {/* Separador de categoria */}
            <div
              className="category-divider"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
            >
              <h3>
                <span className="text-lg">{emoji}</span>
                {group.category.name}
                <span className="item-count">
                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                </span>
              </h3>
            </div>

            {/* Grid de itens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 animate-stagger">
              {group.items.map((item) => (
                <MenuItem key={item.id} item={item} categories={categories} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
