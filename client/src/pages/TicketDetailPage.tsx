import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import Navbar from "../components/Navbar"
import TicketDetail from "@/components/TicketDetail"

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </Link>
        <TicketDetail id={id!} />
      </main>
    </div>
  )
}
