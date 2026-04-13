import { SkeletonCard, SkeletonText, SkeletonBox } from '@/components/ui/Skeleton'

export default function GoalsLoading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <SkeletonText className="w-24 h-5" />
        <SkeletonBox className="w-16 h-9 rounded-xl" />
      </div>

      {/* Goal cards */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
