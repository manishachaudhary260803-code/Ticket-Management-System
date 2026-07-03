import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Link } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { statusDotColor, priorityTextStyle, categoryLabels } from "@/lib/ticket-utils"

export interface Ticket {
  id: string
  subject: string
  from_email: string
  from_name: string | null
  status: string
  priority: string
  category: string
  created_at: string
}

interface Props {
  tickets: Ticket[]
  isPending: boolean
  isError: boolean
  errorMessage: string | null
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
}


const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    meta: { claimCheck: true },
    cell: ({ getValue, row }) => (
      <div className="flex flex-col gap-0.5 min-w-0 max-w-xs">
        <span className="font-mono text-[11px] text-brass-dark tracking-wide">
          #{row.original.id.slice(0, 8).toUpperCase()}
        </span>
        <Link
          to={`/tickets/${row.original.id}`}
          className="link font-medium truncate block"
        >
          {getValue<string>()}
        </Link>
      </div>
    ),
  },
  {
    id: "from",
    header: "From",
    enableSorting: false,
    meta: { truncate: true },
    cell: ({ row }) => (
      <>
        <span className="block">{row.original.from_name || row.original.from_email}</span>
        {row.original.from_name && (
          <span className="block text-xs text-ink-muted">{row.original.from_email}</span>
        )}
      </>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return (
        <span className="inline-flex items-center gap-1.5 text-ink">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor[v] ?? "bg-ink-muted"}`} aria-hidden="true" />
          {v.replace("_", " ")}
        </span>
      )
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className={priorityTextStyle[v] ?? "text-ink-muted"}>{v}</span>
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-ink-muted">{categoryLabels[v] ?? v}</span>
    },
  },
  {
    accessorKey: "created_at",
    header: "Received",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-ink-muted">
        {new Date(getValue<string>()).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
]

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ChevronUp className="inline w-3.5 h-3.5 ml-1" />
  if (isSorted === "desc") return <ChevronDown className="inline w-3.5 h-3.5 ml-1" />
  return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-ink-muted/40" />
}

const SKELETON_COLS = 6

export default function TicketsTable({ tickets, isPending, isError, errorMessage, sorting, onSortingChange }: Props) {
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      onSortingChange(next)
    },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isError) {
    return (
      <p className="text-sm text-maroon bg-maroon-tint px-4 py-3 rounded-md">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary border-b border-border">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort()
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left section-label text-ink-muted select-none ${canSort ? "cursor-pointer hover:text-ink" : ""}`}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && <SortIcon isSorted={header.column.getIsSorted()} />}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {isPending
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: SKELETON_COLS }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.length === 0
            ? (
                <tr>
                  <td colSpan={SKELETON_COLS} className="px-4 py-6 text-center text-ink-muted">
                    No tickets yet.
                  </td>
                </tr>
              )
            : table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-paper transition-colors">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { truncate?: boolean; claimCheck?: boolean } | undefined
                    const cls = [
                      "px-4 py-3",
                      meta?.claimCheck ? "claim-check" : "",
                      meta?.truncate ? "max-w-xs truncate" : meta?.claimCheck ? "" : "whitespace-nowrap",
                    ].filter(Boolean).join(" ")
                    return (
                      <td key={cell.id} className={cls}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
