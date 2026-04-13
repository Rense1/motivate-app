import { SkeletonBox, SkeletonText, SkeletonCircle } from '@/components/ui/Skeleton'

export default function HomeLoading() {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <SkeletonText className="w-40 h-5" />
        <SkeletonText className="w-16 h-4" />
      </div>

      {/* Vision Board skeleton */}
      <SkeletonBox className="w-full h-44 rounded-2xl" />

      {/* 2-column grid: tasks + milestone progress */}
      <div className="grid grid-cols-2 gap-3" style={{ height: '280px' }}>
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-2">
          <SkeletonText className="w-24 h-4 mb-3" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonCircle size="w-5 h-5" />
              <SkeletonText className="flex-1" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 space-y-3">
          <SkeletonText className="w-20 h-4 mb-3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonCircle size="w-8 h-8" />
              <SkeletonText className="flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Button */}
      <SkeletonBox className="w-full h-14 rounded-2xl" />
    </div>
  )
}
