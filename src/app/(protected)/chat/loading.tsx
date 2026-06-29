import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="absolute inset-0 flex bg-[#04060b] text-slate-200 overflow-hidden animate-skeleton-fade">
      {/* Sidebar Skeleton */}
      <div className="w-[340px] shrink-0 border-r border-slate-800 bg-[#090d16]/80 flex flex-col h-full backdrop-blur-md">
        <div className="p-4 shrink-0 flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="w-5 h-5 rounded" />
        </div>
        <div className="px-4 pb-4 shrink-0 border-b border-slate-800/80">
          <Skeleton className="h-9 w-full rounded-full" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-full flex items-center gap-3 p-3 rounded-2xl relative">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-2 w-8" />
                </div>
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area Chat Skeleton */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#06090f] z-10 relative">
        <div className="h-[88px] shrink-0 border-b border-slate-800/80 bg-[#0b0f19] flex items-center px-4 md:px-6 z-20 shadow-sm justify-between">
           <div className="flex items-center gap-4">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="space-y-2">
                 <Skeleton className="h-4 w-32" />
                 <Skeleton className="h-3 w-24" />
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col pt-4 pb-2">
          {Array.from({ length: 6 }).map((_, i) => {
            const isOwn = i % 2 !== 0;
            return (
              <div
                key={i}
                className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Skeleton className="w-8 h-8 rounded-full shrink-0 mt-auto" />
                  <div className="space-y-2 flex flex-col">
                    <Skeleton 
                      className={`h-[42px] ${
                        isOwn 
                          ? 'rounded-2xl rounded-br-sm w-[200px]' 
                          : 'rounded-2xl rounded-bl-sm w-[280px]'
                      }`} 
                    />
                    {i % 3 === 0 && (
                      <Skeleton 
                        className={`h-[42px] ${
                          isOwn 
                            ? 'rounded-2xl rounded-br-sm w-[150px] self-end' 
                            : 'rounded-2xl rounded-bl-sm w-[180px] self-start'
                        }`} 
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="shrink-0 p-4 md:p-6 border-t border-slate-800/80 bg-[#0b0f19]">
           <Skeleton className="w-full h-14 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
