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
import { statusStyles, priorityStyles, categoryLabels } from "@/lib/ticket-utils"

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
    meta: { truncate: true },
    cell: ({ getValue, row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="link font-medium"
      >
        {getValue<string>()}
      </Link>
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
          <span className="block text-xs text-gray-400">{row.original.from_email}</span>
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[v] ?? "bg-gray-100 text-gray-600"}`}>
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
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[v] ?? "bg-gray-100 text-gray-600"}`}>
          {v}
        </span>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => {
      const v = getValue<string>()
      return <span className="text-gray-600">{categoryLabels[v] ?? v}</span>
    },
  },
  {
    accessorKey: "created_at",
    header: "Received",
    cell: ({ getValue }) => (
      <span className="text-gray-500">
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
  return <ChevronsUpDown className="inline w-3.5 h-3.5 ml-1 text-gray-300" />
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
      <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort()
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left font-medium text-gray-500 select-none ${canSort ? "cursor-pointer hover:text-gray-700" : ""}`}
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
        <tbody className="divide-y divide-gray-100">
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
                  <td colSpan={SKELETON_COLS} className="px-4 py-6 text-center text-gray-400">
                    No tickets yet.
                  </td>
                </tr>
              )
            : table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => {
                    const truncate = (cell.column.columnDef.meta as { truncate?: boolean } | undefined)?.truncate
                    return (
                      <td key={cell.id} className={`px-4 py-3${truncate ? " max-w-xs truncate" : " whitespace-nowrap"}`}>
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
