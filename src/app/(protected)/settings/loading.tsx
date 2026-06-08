import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl w-full">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="w-[18px] h-[18px] rounded" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>

        {/* Info rows */}
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3.5 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Account Actions */}
      <div className="p-6 rounded-xl bg-white/70 backdrop-blur-md border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-[18px] h-[18px] rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}
