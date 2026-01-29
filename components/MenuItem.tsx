import { MenuItem as MenuItemType, Category } from "@/lib/validation";

interface MenuItemProps {
  item: MenuItemType;
  categories?: Category[];
}

// Detectar se um produto é novo (criado há menos de 7 dias)
function isNewProduct(item: MenuItemType): boolean {
  if (!item.created_at) return false;
  const createdDate = new Date(item.created_at);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

// Gerar cor consistente para categoria baseada no nome
function getCategoryColor(categoryName: string): string {
  const colorPalette = [
    '#7c4e42', // marrom
    '#2563eb', // azul
    '#059669', // verde
    '#d97706', // amarelo
    '#dc2626', // vermelho
    '#7c3aed', // roxo
    '#0891b2', // ciano
    '#be185d', // rosa
    '#65a30d', // lima
    '#ea580c', // laranja
  ];

  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
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
      className="group bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 transition-all duration-300 cursor-pointer gpu-accelerate flex flex-col"
      style={{
        "--hover-border": categoryColor,
        borderTop: `3px solid ${categoryColor}`
      } as any}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02) translateZ(0)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(124, 78, 66, 0.15)';
        e.currentTarget.style.borderColor = categoryColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1) translateZ(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {/* Category Accent Bar at Top */}
      <div style={{ height: '3px', backgroundColor: categoryColor }} />

      {/* Image Container */}
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex-shrink-0">
        {item.image && item.image.trim() !== "" ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain transition-transform duration-500 bg-white"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-1">🍽️</span>
            <span className="text-xs font-medium">Sem imagem</span>
          </div>
        )}

        {/* Availability Badge - Top Right */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md ${item.available ? 'bg-green-500' : 'bg-red-500'}`}>
          {item.available ? "Disponível" : "Indisponível"}
        </span>

        {/* Badges Container - Top Left */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {/* NOVO Badge */}
          {isNew && (
            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }} className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              Novo
            </span>
          )}

          {/* DESTAQUE Badge (prepared for future use) */}
          {(item as any).featured && (
            <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }} className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              Destaque
            </span>
          )}
        </div>

        {/* Price Badge - Bottom Right */}
        <div className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500 to-green-600 shadow-md px-4 py-2 rounded-md">
          <span className="font-extrabold text-white text-base">
            R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Product Name */}
        <h3 className="font-heading text-base font-semibold text-gray-900 mb-1.5 line-clamp-2 transition-colors duration-200">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
          {item.description}
        </p>

        {/* Category Tag - Bottom */}
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
