export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      // aria-hidden: a skeleton is a placeholder, and announcing it as content
      // makes a screen reader read "loading box" instead of the real text that
      // is about to replace it.
      aria-hidden="true"
      className={['skeleton-sheen rounded-lg', className].filter(Boolean).join(' ')}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
