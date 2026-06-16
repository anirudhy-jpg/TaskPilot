import { Skeleton } from "@/components/ui/skeleton"

export default function ProtectedLoading() {
  return (
    <div className="space-y-6 w-full">
      {/* Banner skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800 border-l-4 border-l-amber-500/30 shadow-sm">
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-14" />
          </div>
        ))}
      </div>

      {/* Chart cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="w-full h-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
