// Reusable skeleton primitives — used by all loading.tsx files

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`skeleton h-4 rounded-full ${className}`} />
}

export function SkeletonCircle({ size = 'w-12 h-12' }: { size?: string }) {
  return <div className={`skeleton rounded-full ${size}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-14 h-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="w-3/4" />
          <SkeletonText className="w-1/2" />
        </div>
      </div>
    </div>
  )
}
