import { useEffect, useState } from "react"
import { X } from "lucide-react"

export interface TicketFilters {
  search: string
  status: string[]
  priority: string[]
  category: string[]
}

export const EMPTY_FILTERS: TicketFilters = {
  search: "",
  status: [],
  priority: [],
  category: [],
}

export function hasActiveFilters(f: TicketFilters) {
  return f.search !== "" || f.status.length > 0 || f.priority.length > 0 || f.category.length > 0
}

interface Props {
  filters: TicketFilters
  onChange: (f: TicketFilters) => void
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", cls: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
  { value: "in_progress", label: "In Progress", cls: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200" },
  { value: "resolved", label: "Resolved", cls: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200" },
]

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", cls: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200" },
  { value: "medium", label: "Medium", cls: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200" },
  { value: "high", label: "High", cls: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" },
]

const CATEGORY_OPTIONS = [
  { value: "technical_it", label: "Technical / IT", cls: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200" },
  { value: "billing_fees", label: "Billing / Fees", cls: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200" },
  { value: "other", label: "Other", cls: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200" },
]

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function PillGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: { value: string; label: string; cls: string }[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-400 shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`text-xs px-2.5 py-1 rounded border font-medium transition-all ${opt.cls} ${
                active ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-60"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TicketFilterBar({ filters, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search)

  // Debounce search — only fire onChange after user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Keep local input in sync if parent clears filters
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const active = hasActiveFilters(filters)

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search subject…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="text-sm border border-gray-200 rounded-md pl-3 pr-8 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(""); onChange({ ...filters, search: "" }) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      <PillGroup
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onToggle={(v) => onChange({ ...filters, status: toggle(filters.status, v) })}
      />

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      <PillGroup
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priority}
        onToggle={(v) => onChange({ ...filters, priority: toggle(filters.priority, v) })}
      />

      <div className="w-px h-5 bg-gray-200 shrink-0" />

      <PillGroup
        label="Category"
        options={CATEGORY_OPTIONS}
        selected={filters.category}
        onToggle={(v) => onChange({ ...filters, category: toggle(filters.category, v) })}
      />

      {active && (
        <>
          <div className="w-px h-5 bg-gray-200 shrink-0" />
          <button
            type="button"
            onClick={() => { setSearchInput(""); onChange(EMPTY_FILTERS) }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        </>
      )}
    </div>
  )
}
