import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import Navbar from "../components/Navbar"
import TicketsTable from "../components/TicketsTable"

interface Ticket {
  id: string
  subject: string
  from_email: string
  from_name: string | null
  status: string
  priority: string
  category: string
  created_at: string
}

async function fetchTickets(): Promise<Ticket[]> {
  const res = await axios.get<Ticket[]>("/api/tickets", { withCredentials: true })
  return res.data
}

export default function TicketsPage() {
  const { data: tickets = [], isPending, isError, error } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  })

  const errorMessage = isError
    ? axios.isAxiosError(error)
      ? (error.response?.data?.detail ?? error.message)
      : String(error)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Tickets</h2>
        </div>

        <TicketsTable
          tickets={tickets}
          isPending={isPending}
          isError={isError}
          errorMessage={errorMessage}
        />
      </main>
    </div>
  )
}
