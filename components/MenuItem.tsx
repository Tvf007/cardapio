import { MenuItem as MenuItemType, Category } from "@/lib/validation";

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

function getCategoryColor(categoryName: string): string {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function getCategoryName(categoryId: string, categories?: Category[]): string {
  if (!categories) return "N/A";
  return categories.find((c) => c.id === categoryId)?.name || "N/A";
}

export function MenuItem({ item, categories }: MenuItemProps) {
  const isNew = isNewProduct(item);
  const categoryName = getCategoryName(item.category, categories);
  const categoryColor = getCategoryColor(categoryName);

  return (
    <div
      className="menu-card group bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex flex-col"
      style={{ borderTop: `3px solid ${categoryColor}` }}
    >
      {/* Image Container */}
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex-shrink-0">
        {item.image && item.image.trim() !== "" ? (
          <img
            src={item.image}
            alt={item.name}
            className="menu-card-image w-full h-full object-contain bg-white"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-1">&#127869;</span>
            <span className="text-xs font-medium">Sem imagem</span>
          </div>
        )}

        {/* Availability Badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md ${item.available ? 'bg-green-500' : 'bg-red-500'}`}>
          {item.available ? "Disponivel" : "Indisponivel"}
        </span>

        {/* New Badge */}
        {isNew && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md bg-gradient-to-r from-amber-500 to-red-500">
              Novo
            </span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500 to-green-600 shadow-md px-4 py-2 rounded-md">
          <span className="font-extrabold text-white text-base">
            R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-gray-900 mb-1.5 line-clamp-2">
          {item.name}
        </h3>

        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
            {item.description}
          </p>
        )}

        <div className="mt-auto">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: `${categoryColor}15`,
              color: categoryColor,
              borderColor: categoryColor
            }}
          >
            {categoryName}
          </span>
        </div>
      </div>
    </div>
  );
}
