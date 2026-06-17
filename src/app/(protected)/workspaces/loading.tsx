import { Skeleton } from "@/components/ui/skeleton"

export default function WorkspacesLoading() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4 px-2 w-full animate-skeleton-fade">
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 border-b border-slate-800 pb-5">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Owned Section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Member Section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
