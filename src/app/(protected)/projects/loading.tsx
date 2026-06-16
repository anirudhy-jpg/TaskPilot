import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[380px]"
          >
            {/* Card top */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="w-6 h-6 rounded" />
              </div>

              {/* Description */}
              <Skeleton className="h-3 w-full mb-1.5" />
              <Skeleton className="h-3 w-4/5 mb-5" />

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>

              {/* Mini task list */}
              <div className="border-t border-slate-800/80 pt-3">
                <Skeleton className="h-3 w-24 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
