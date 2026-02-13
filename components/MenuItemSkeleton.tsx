'use client';

export function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {/* Mobile: layout horizontal */}
      <div className="flex sm:flex-col">
        {/* Image Skeleton */}
        <div className="w-[110px] h-[110px] sm:w-full sm:h-48 skeleton flex-shrink-0" />

        {/* Content Skeleton */}
        <div className="p-3 sm:p-4 flex-1">
          <div className="h-4 sm:h-5 skeleton rounded-lg mb-2 w-3/4" />
          <div className="h-3 sm:h-4 skeleton rounded-lg mb-2 w-full" />
          <div className="h-5 skeleton rounded-lg w-20 mt-2" />
        </div>
      </div>
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  );
}
