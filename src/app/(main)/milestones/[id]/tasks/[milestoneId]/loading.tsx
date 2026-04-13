import { SkeletonBox, SkeletonText, SkeletonCircle } from '@/components/ui/Skeleton'

export default function TasksLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header skeleton */}
      <div className="bg-white/90 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <SkeletonCircle size="w-8 h-8" />
          <SkeletonText className="w-20 h-3" />
        </div>
        <SkeletonCircle size="w-9 h-9" />
      </div>

      <div className="p-4 space-y-4">
        {/* Milestone circle */}
        <div className="flex flex-col items-center py-4 gap-2">
          <SkeletonCircle size="w-28 h-28" />
          <SkeletonText className="w-24 h-3" />
        </div>

        {/* Connector */}
        <div className="flex justify-center">
          <SkeletonBox className="w-0.5 h-6 rounded-none" />
        </div>

        {/* Task cards */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <SkeletonBox className="w-full h-16 rounded-2xl" />
              {i < 2 && <SkeletonText className="w-4 h-4 mt-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
