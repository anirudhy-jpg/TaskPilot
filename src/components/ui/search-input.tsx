"use client"

import React, { useEffect, useState, useRef } from "react"
import { Search, X } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({ placeholder = "Search..." }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get("search") || ""
  const [value, setValue] = useState(initialSearch)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(searchParams.get("search") || "")
  }, [searchParams])

  const handleSearch = (term: string) => {
    setValue(term)
    
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (term) {
        params.set("search", term)
      } else {
        params.delete("search")
      }
      
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
  }

  const clearSearch = () => {
    setValue("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative flex-1 max-w-sm shrink-0">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-slate-500" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border border-slate-800 rounded-lg leading-5 bg-slate-900/60 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {value && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
