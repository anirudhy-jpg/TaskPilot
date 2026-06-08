import { Skeleton } from "@/components/ui/skeleton"

export default function TeamsLoading() {
  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm"
          >
            {/* Project header */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>

            {/* Member rows */}
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80"
                >
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-36" />
                  </div>
                  <Skeleton className="h-4 w-14 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
