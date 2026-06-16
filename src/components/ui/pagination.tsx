"use client"

import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
  itemName?: string
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemName = "items",
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const range = 1 // number of pages to show around current page

    pages.push(1)

    if (currentPage - range > 2) {
      pages.push("...")
    }

    const start = Math.max(2, currentPage - range)
    const end = Math.min(totalPages - 1, currentPage + range)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage + range < totalPages - 1) {
      pages.push("...")
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] transition-all duration-300",
        className
      )}
    >
      {/* Page status text */}
      <div className="text-[11px] font-semibold text-slate-400">
        Showing <span className="text-slate-200 font-extrabold">{startItem}-{endItem}</span> of{" "}
        <span className="text-slate-200 font-extrabold">{totalItems}</span> {itemName}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-slate-800 bg-slate-950/40 hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-slate-950/40 disabled:hover:text-slate-500 cursor-pointer rounded-xl transition-all"
          title="Previous Page"
        >
          <ChevronLeft size={14} />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs font-semibold text-slate-500 select-none"
                >
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <Button
                key={`page-${pageNum}`}
                variant={isActive ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "font-bold text-xs rounded-xl transition-all cursor-pointer",
                  isActive
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-3xs border-0"
                    : "border-slate-800 bg-slate-950/40 hover:bg-amber-500/10 hover:text-amber-400 text-slate-400"
                )}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-slate-800 bg-slate-955/40 hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-slate-955/40 disabled:hover:text-slate-500 cursor-pointer rounded-xl transition-all"
          title="Next Page"
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  )
}
