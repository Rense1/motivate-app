import { SkeletonBox, SkeletonText, SkeletonCircle } from '@/components/ui/Skeleton'

export default function MilestonesLoading() {
  return (
    <div>
      {/* Sticky header skeleton */}
      <div className="bg-white/90 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SkeletonCircle size="w-8 h-8" />
          <div className="space-y-1">
            <SkeletonText className="w-32 h-4" />
            <SkeletonText className="w-16 h-3" />
          </div>
        </div>
        <SkeletonBox className="w-16 h-9 rounded-xl" />
      </div>

      {/* Roadmap skeleton — vertical list of milestone circles */}
      <div className="flex flex-col items-center py-6 gap-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <SkeletonCircle size="w-24 h-24" />
            <SkeletonText className="w-20 h-3 mt-2" />
            {i < 3 && <SkeletonBox className="w-0.5 h-10 rounded-none mt-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}
