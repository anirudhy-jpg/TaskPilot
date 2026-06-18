import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6 w-full h-full flex flex-col select-none animate-skeleton-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-start min-h-[500px]">
        {(["To Do", "In Progress", "Done"] as const).map((col, colIdx) => (
          <div
            key={col}
            className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[450px]"
          >
            {/* Column header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="w-6 h-6 rounded" />
            </div>

            {/* Task card skeletons — staggered count */}
            <div className="space-y-3 flex-1">
              {Array.from({ length: colIdx === 0 ? 3 : colIdx === 1 ? 2 : 1 }).map(
                (_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="bg-slate-900 backdrop-blur-sm border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="w-4 h-4 rounded" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="w-3.5 h-3.5 rounded" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                      <Skeleton className="w-6 h-6 rounded-full" />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
