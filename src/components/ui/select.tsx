import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  className = "",
  error = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800 text-left font-medium shadow-2xs hover:bg-slate-50/50 cursor-pointer transition-all duration-150 ${
          error
            ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500"
            : "border-slate-200 focus:ring-amber-500/20 focus:border-amber-500"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 opacity-50 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 min-w-[8rem] w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-slate-950 shadow-md animate-in fade-in-80 slide-in-from-top-1 duration-150 mt-1.5">
          <div className="max-h-60 overflow-y-auto scrollbar-thin py-0.5">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2.5 text-xs outline-none hover:bg-slate-50 hover:text-slate-900 transition-colors text-left font-bold ${
                      isSelected ? "bg-amber-500/5 text-amber-900" : "text-slate-700"
                    }`}
                  >
                    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-amber-600 stroke-[2.5]" />
                      )}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
