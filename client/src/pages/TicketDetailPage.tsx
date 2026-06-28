import { Link, useParams } from "react-router-dom"
import axios from "axios"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Navbar from "../components/Navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { statusStyles, priorityStyles, categoryLabels } from "@/lib/ticket-utils"

interface TicketDetail {
  id: string
  subject: string
  body: string
  status: string
  priority: string
  category: string
  from_email: string
  from_name: string | null
  thread_id: string | null
  assignee_id: string | null
  ai_summary: string | null
  ai_draft_reply: string | null
  created_at: string
  updated_at: string
}

interface Agent {
  id: string
  name: string
  email: string
}

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await axios.get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true })
  return res.data
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await axios.get<Agent[]>("/api/users/agents", { withCredentials: true })
  return res.data
}

async function assignTicket(ticketId: string, assigneeId: string | null): Promise<TicketDetail> {
  const res = await axios.patch<TicketDetail>(
    `/api/tickets/${ticketId}/assign`,
    { assignee_id: assigneeId },
    { withCredentials: true },
  )
  return res.data
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: ticket, isPending, isError, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  })

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string | null) => assignTicket(id!, assigneeId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["ticket", id], updated)
    },
  })

  const errorMessage = isError
    ? axios.isAxiosError(error)
      ? (error.response?.data?.detail ?? error.message)
      : String(error)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </Link>

        {isPending && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 mt-6">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
            <Skeleton className="h-40 mt-4" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">{errorMessage}</p>
        )}

        {ticket && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{ticket.subject}</h1>
              <p className="mt-1 text-sm text-gray-500">
                #{ticket.id.slice(0, 8)} · received{" "}
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-6 bg-white rounded-lg border border-gray-200 px-6 py-5">
              <MetaItem label="Status">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </MetaItem>
              <MetaItem label="Priority">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[ticket.priority] ?? "bg-gray-100 text-gray-600"}`}>
                  {ticket.priority}
                </span>
              </MetaItem>
              <MetaItem label="Category">
                <span className="text-sm text-gray-800">{categoryLabels[ticket.category] ?? ticket.category}</span>
              </MetaItem>
              <MetaItem label="From">
                <span className="text-sm text-gray-800 block">{ticket.from_name ?? ticket.from_email}</span>
                {ticket.from_name && (
                  <span className="text-xs text-gray-400">{ticket.from_email}</span>
                )}
              </MetaItem>
              <MetaItem label="Assigned to">
                <select
                  value={ticket.assignee_id ?? ""}
                  onChange={(e) => assignMutation.mutate(e.target.value || null)}
                  disabled={assignMutation.isPending}
                  className="text-sm border border-gray-200 rounded px-2 py-0.5 text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50 w-full"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </MetaItem>
            </dl>

            <section className="bg-white rounded-lg border border-gray-200 px-6 py-5">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Email body</h2>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{ticket.body}</pre>
            </section>

            {ticket.ai_summary && (
              <section className="bg-blue-50 rounded-lg border border-blue-100 px-6 py-5">
                <h2 className="text-sm font-medium text-blue-700 uppercase tracking-wide mb-3">AI summary</h2>
                <p className="text-sm text-gray-800 leading-relaxed">{ticket.ai_summary}</p>
              </section>
            )}

            {ticket.ai_draft_reply && (
              <section className="bg-amber-50 rounded-lg border border-amber-100 px-6 py-5">
                <h2 className="text-sm font-medium text-amber-700 uppercase tracking-wide mb-3">AI draft reply</h2>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{ticket.ai_draft_reply}</pre>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
