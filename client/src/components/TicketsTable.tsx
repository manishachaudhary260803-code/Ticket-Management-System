import { Skeleton } from "@/components/ui/skeleton"

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

interface Props {
  tickets: Ticket[]
  isPending: boolean
  isError: boolean
  errorMessage: string | null
}

const statusStyles: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-gray-100 text-gray-600",
}

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-700",
}

const categoryLabels: Record<string, string> = {
  technical_it: "Technical / IT",
  billing_fees: "Billing / Fees",
  other: "Other",
}

const headers = (
  <tr>
    <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
    <th className="px-4 py-3 text-left font-medium text-gray-500">From</th>
    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
    <th className="px-4 py-3 text-left font-medium text-gray-500">Priority</th>
    <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
    <th className="px-4 py-3 text-left font-medium text-gray-500">Received</th>
  </tr>
)

export default function TicketsTable({ tickets, isPending, isError, errorMessage }: Props) {
  if (isPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">{headers}</thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">{headers}</thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate">
                {ticket.subject}
              </td>
              <td className="px-4 py-3 text-gray-600">
                <span className="block">{ticket.from_name || ticket.from_email}</span>
                {ticket.from_name && (
                  <span className="block text-xs text-gray-400">{ticket.from_email}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusStyles[ticket.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[ticket.priority] ?? "bg-gray-100 text-gray-600"}`}>
                  {ticket.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {categoryLabels[ticket.category] ?? ticket.category}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                No tickets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
