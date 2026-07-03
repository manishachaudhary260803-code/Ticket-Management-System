import { useState } from "react"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import type { SortingState } from "@tanstack/react-table"
import Navbar from "../components/Navbar"
import TicketsTable, { type Ticket } from "../components/TicketsTable"
import TicketFilterBar, { type TicketFilters, EMPTY_FILTERS } from "../components/TicketFilterBar"
import TicketPagination from "../components/TicketPagination"

interface PaginatedTickets {
  items: Ticket[]
  total: number
  page: number
  page_size: number
}

async function fetchTickets(
  sorting: SortingState,
  filters: TicketFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedTickets> {
  const params = new URLSearchParams()
  if (sorting.length > 0) {
    params.set("sort_by", sorting[0].id)
    params.set("sort_dir", sorting[0].desc ? "desc" : "asc")
  }
  if (filters.search) params.set("search", filters.search)
  filters.status.forEach((s) => params.append("status", s))
  filters.priority.forEach((p) => params.append("priority", p))
  filters.category.forEach((c) => params.append("category", c))
  params.set("page", String(page))
  params.set("page_size", String(pageSize))

  const res = await axios.get<PaginatedTickets>("/api/tickets", {
    withCredentials: true,
    params,
  })
  return res.data
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  function handleSortingChange(s: SortingState) {
    setSorting(s)
    setPage(1)
  }

  function handleFiltersChange(f: TicketFilters) {
    setFilters(f)
    setPage(1)
  }

  function handlePageSizeChange(ps: number) {
    setPageSize(ps)
    setPage(1)
  }

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["tickets", sorting, filters, page, pageSize],
    queryFn: () => fetchTickets(sorting, filters, page, pageSize),
  })

  const tickets = data?.items ?? []
  const total = data?.total ?? 0

  const errorMessage = isError
    ? axios.isAxiosError(error)
      ? (error.response?.data?.detail ?? error.message)
      : String(error)
    : null

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="section-label text-brass-dark mb-1">Ticket Queue</p>
            <h2 className="font-display italic text-3xl text-ink">Tickets</h2>
          </div>
        </div>

        <TicketFilterBar filters={filters} onChange={handleFiltersChange} />

        <TicketsTable
          tickets={tickets}
          isPending={isPending}
          isError={isError}
          errorMessage={errorMessage}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />

        {!isError && (
          <TicketPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </main>
    </div>
  )
}
