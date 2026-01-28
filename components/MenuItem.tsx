import { MenuItem as MenuItemType } from "@/lib/validation";

interface MenuItemProps {
  item: MenuItemType;
}

export function MenuItem({ item }: MenuItemProps) {
  return (
    <div
      className="group bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 transition-all duration-300 cursor-pointer gpu-accelerate"
      style={{ "--hover-border": '#7c4e42' } as any}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02) translateZ(0)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(124, 78, 66, 0.15)';
        e.currentTarget.style.borderColor = '#7c4e42';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1) translateZ(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      {/* Image Container */}
      <div className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden group-hover:border-b-4" style={{ "--hover-border": '#7c4e42' } as any}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{
              animation: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-30">🍽️</span>
          </div>
        )}

        {/* Availability Badge */}
        {!item.available && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-gray-800 text-white px-3 py-1 rounded-md font-medium text-xs">
              Indisponível
            </span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-white shadow-md px-4 py-2 rounded-md">
          <span className="text-fluid-lg font-bold text-green-600">
            R$ {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 text-center">
        <h3 className="font-heading text-fluid-base font-semibold text-gray-900 mb-1.5 line-clamp-2 transition-colors duration-200" style={{ '--group-hover-color': '#7c4e42' } as any} onMouseEnter={(e) => (e.currentTarget.style.color = '#7c4e42')} onMouseLeave={(e) => (e.currentTarget.style.color = '#111827')}>
          {item.name}
        </h3>

        <p className="text-fluid-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
          {item.description}
        </p>

        {/* Availability Indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${item.available ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={`text-xs font-medium ${item.available ? 'text-green-700' : 'text-red-600'}`}>
            {item.available ? 'Disponível' : 'Indisponível'}
          </span>
        </div>
      </div>
    </div>
  );
}
