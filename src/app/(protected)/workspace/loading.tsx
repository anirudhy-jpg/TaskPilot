import { Skeleton } from "@/components/ui/skeleton"

export default function WorkspaceLoading() {
  return (
    <div className="space-y-6 w-full animate-skeleton-fade">
      {/* Welcome Banner skeleton */}
      <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 border-l-2 border-l-amber-500 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-72" />
        </div>
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Summary Cards ── */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-14 rounded" />
            </div>
          ))}
        </div>

        {/* ── Pie Chart skeleton ── */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="w-40 h-40 rounded-full" />
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Bar Chart skeleton ── */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="h-64 flex items-end justify-around gap-3 px-4 pb-2">
            {[40, 70, 55, 85, 30].map((h, i) => (
              <Skeleton
                key={i}
                className="w-8 rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-around mt-3 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
