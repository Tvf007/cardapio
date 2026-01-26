'use client';

export function MenuItemSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      {/* Image Skeleton */}
      <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton" />

      {/* Content Skeleton */}
      <div className="p-4">
        {/* Name Skeleton */}
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded mb-2 w-3/4" />

        {/* Category Skeleton */}
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded mb-3 w-1/2" />

        {/* Description Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded w-full" />
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded w-5/6" />
        </div>

        {/* Price and Button Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded w-20" />
          <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 skeleton rounded w-20" />
        </div>
      </div>
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  );
}
