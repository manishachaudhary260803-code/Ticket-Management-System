import axios from "axios"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Send, Sparkles } from "lucide-react"
import { useRef, useState } from "react"
import { DetailSection } from "@/components/DetailSection"
import { Skeleton } from "@/components/ui/skeleton"
import { priorityStyles } from "@/lib/ticket-utils"
import { authClient } from "@/lib/auth-client"

interface Ticket {
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

interface ReplyAuthor {
  id: string
  name: string
}

interface Reply {
  id: string
  ticket_id: string
  sender_type: "agent" | "customer"
  author: ReplyAuthor | null
  body: string
  created_at: string
}

async function fetchTicket(id: string): Promise<Ticket> {
  const res = await axios.get<Ticket>(`/api/tickets/${id}`, { withCredentials: true })
  return res.data
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await axios.get<Agent[]>("/api/users/agents", { withCredentials: true })
  return res.data
}

async function updateTicket(ticket: Ticket, patch: { status?: string; category?: string }): Promise<Ticket> {
  const res = await axios.patch<Ticket>(`/api/tickets/${ticket.id}`, patch, { withCredentials: true })
  return res.data
}

async function assignTicket(ticket: Ticket, assigneeId: string | null): Promise<Ticket> {
  const res = await axios.patch<Ticket>(
    `/api/tickets/${ticket.id}/assign`,
    { assignee_id: assigneeId },
    { withCredentials: true },
  )
  return res.data
}

async function fetchReplies(ticket: Ticket): Promise<Reply[]> {
  const res = await axios.get<Reply[]>(`/api/tickets/${ticket.id}/replies`, { withCredentials: true })
  return res.data
}

async function postReply(ticket: Ticket, body: string): Promise<Reply> {
  const res = await axios.post<Reply>(
    `/api/tickets/${ticket.id}/replies`,
    { body },
    { withCredentials: true },
  )
  return res.data
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="section-label text-ink-muted mb-1">{label}</p>
      {children}
    </div>
  )
}

function TicketContent({ ticket }: { ticket: Ticket }) {
  return (
    <>
      <DetailSection label="From" className="space-y-1">
        <p className="text-sm font-medium text-ink">{ticket.from_name ?? ticket.from_email}</p>
        {ticket.from_name && <p className="text-sm text-ink-muted">{ticket.from_email}</p>}
      </DetailSection>

      <DetailSection label="Email body">
        <pre className="text-ink">{ticket.body}</pre>
      </DetailSection>

      {ticket.ai_summary && (
        <DetailSection label="AI Summary" variant="sage">
          <p className="text-sm text-ink leading-relaxed">{ticket.ai_summary}</p>
        </DetailSection>
      )}

      {ticket.ai_draft_reply && (
        <DetailSection label="AI Draft Reply" variant="brass">
          <pre className="text-ink">{ticket.ai_draft_reply}</pre>
        </DetailSection>
      )}
    </>
  )
}

function ReplyCard({ reply }: { reply: Reply }) {
  const isAgent = reply.sender_type === "agent"
  return (
    <div className={`rounded-lg border px-5 py-4 ${isAgent ? "bg-card border-border" : "bg-secondary/60 border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">
            {isAgent ? (reply.author?.name ?? "Agent") : "Customer"}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isAgent ? "bg-navy-tint text-navy" : "bg-secondary text-ink-muted"}`}>
            {isAgent ? "Agent" : "Customer"}
          </span>
        </div>
        <span className="font-mono text-xs text-ink-muted">{formatDateTime(reply.created_at)}</span>
      </div>
      <div className="text-sm text-ink/90 whitespace-pre-wrap">{reply.body}</div>
    </div>
  )
}

async function summarizeConversation(
  ticketSubject: string,
  ticketBody: string,
  replies: Reply[],
): Promise<string> {
  const res = await axios.post<{ summary: string }>(
    "/api/auth/ai/summarize",
    {
      ticket_subject: ticketSubject,
      ticket_body: ticketBody,
      replies: replies.map((r) => ({
        sender_type: r.sender_type,
        author_name: r.author?.name ?? null,
        body: r.body,
      })),
    },
    { withCredentials: true },
  )
  return res.data.summary
}

async function polishReply(draft: string, agentName: string, customerFirstName?: string): Promise<string> {
  const res = await axios.post<{ polished: string }>(
    "/api/auth/ai/polish-reply",
    { draft, agent_name: agentName, customer_first_name: customerFirstName },
    { withCredentials: true },
  )
  return res.data.polished
}

export default function TicketDetail({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [replyBody, setReplyBody] = useState("")
  const [isPolishing, setIsPolishing] = useState(false)
  const [polishError, setPolishError] = useState<string | null>(null)
  const [conversationSummary, setConversationSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarizeError, setSummarizeError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: ticket, isPending, isError, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  })

  const { data: replies = [] } = useQuery({
    queryKey: ["replies", id],
    queryFn: () => fetchReplies(ticket!),
    enabled: !!ticket,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: { status?: string; category?: string }) => updateTicket(ticket!, patch),
    onSuccess: (updated) => queryClient.setQueryData(["ticket", id], updated),
  })

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string | null) => assignTicket(ticket!, assigneeId),
    onSuccess: (updated) => queryClient.setQueryData(["ticket", id], updated),
  })

  const replyMutation = useMutation({
    mutationFn: (body: string) => postReply(ticket!, body),
    onSuccess: (newReply) => {
      queryClient.setQueryData(["replies", id], (prev: Reply[]) => [...(prev ?? []), newReply])
      setReplyBody("")
    },
  })

  function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim() || replyMutation.isPending) return
    replyMutation.mutate(replyBody)
  }

  async function handlePolish() {
    if (!replyBody.trim() || isPolishing) return
    setPolishError(null)
    setIsPolishing(true)
    try {
      const customerFirstName = ticket!.from_name?.split(" ")[0]
      const polished = await polishReply(replyBody, session?.user.name ?? "Support Team", customerFirstName)
      setReplyBody(polished)
    } catch (err) {
      setPolishError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message)
          : "Failed to polish reply"
      )
    } finally {
      setIsPolishing(false)
    }
  }

  async function handleSummarize() {
    if (isSummarizing) return
    setSummarizeError(null)
    setIsSummarizing(true)
    try {
      const summary = await summarizeConversation(ticket?.subject ?? "", ticket?.body ?? "", replies)
      setConversationSummary(summary)
    } catch (err) {
      setSummarizeError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message)
          : "Failed to summarize conversation"
      )
    } finally {
      setIsSummarizing(false)
    }
  }

  const errorMessage = isError
    ? axios.isAxiosError(error)
      ? (error.response?.data?.detail ?? error.message)
      : String(error)
    : null

  if (isPending) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 mt-4" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-maroon bg-maroon-tint px-4 py-3 rounded-md">{errorMessage}</p>
  }

  if (!ticket) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

      {/* Left — main content */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <p className="font-mono text-xs text-brass-dark tracking-wide mb-1">#{ticket.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="font-display italic text-2xl text-ink">{ticket.subject}</h1>
        </div>

        <TicketContent ticket={ticket} />

        {/* Reply thread */}
        <section>
          <p className="section-label text-ink-muted mb-3">
            Reply Thread {replies.length > 0 && `(${replies.length})`}
          </p>

          {replies.length === 0 ? (
            <p className="text-sm text-ink-muted italic">No replies yet.</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-navy bg-white border border-navy rounded-lg hover:bg-navy-tint disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isSummarizing ? "Summarizing…" : conversationSummary ? "Re-summarize" : "Summarize"}
              </button>
            </div>
            {summarizeError && (
              <p className="text-xs text-maroon">{summarizeError}</p>
            )}
            {conversationSummary && (
              <DetailSection label="Conversation Summary" variant="sage">
                <p className="text-sm text-ink leading-relaxed">{conversationSummary}</p>
              </DetailSection>
            )}
          </div>

          <form onSubmit={handleReplySubmit} className="mt-4 space-y-2">
            <textarea
              ref={textareaRef}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleReplySubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Write a reply… (Enter to send, Shift+Enter for new line)"
              rows={4}
              className="w-full text-sm border border-border rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:ring-1 focus:ring-navy resize-none"
            />
            {(replyMutation.isError || polishError) && (
              <p className="text-xs text-maroon">
                {polishError
                  ? polishError
                  : axios.isAxiosError(replyMutation.error)
                    ? (replyMutation.error.response?.data?.detail ?? replyMutation.error.message)
                    : "Failed to send reply"}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePolish}
                disabled={!replyBody.trim() || isPolishing || replyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-navy bg-white border border-navy rounded-lg hover:bg-navy-tint disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isPolishing ? "Polishing…" : "Polish"}
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || replyMutation.isPending || isPolishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-navy rounded-lg hover:bg-navy-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {replyMutation.isPending ? "Sending…" : "Send Reply"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Right — metadata & actions */}
      <aside className="bg-card rounded-lg border border-border px-5 py-6 space-y-5">
        <SidebarField label="Status">
          <select
            aria-label="Status"
            value={ticket.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            disabled={updateMutation.isPending}
            className="field-select"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </SidebarField>

        <SidebarField label="Category">
          <select
            aria-label="Category"
            value={ticket.category}
            onChange={(e) => updateMutation.mutate({ category: e.target.value })}
            disabled={updateMutation.isPending}
            className="field-select"
          >
            <option value="technical_it">Technical / IT</option>
            <option value="billing_fees">Billing / Fees</option>
            <option value="other">Other</option>
          </select>
        </SidebarField>

        <SidebarField label="Assigned To">
          <select
            aria-label="Assigned to"
            value={ticket.assignee_id ?? ""}
            onChange={(e) => assignMutation.mutate(e.target.value || null)}
            disabled={assignMutation.isPending}
            className="field-select"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </SidebarField>

        <SidebarField label="Priority">
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${priorityStyles[ticket.priority] ?? "bg-secondary text-ink-muted"}`}>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </span>
        </SidebarField>

        <div className="border-t border-border pt-4 space-y-4">
          <SidebarField label="Received">
            <p className="font-mono text-sm text-ink/90">{formatDateTime(ticket.created_at)}</p>
          </SidebarField>

          <SidebarField label="Last Updated">
            <p className="font-mono text-sm text-ink/90">{formatDateTime(ticket.updated_at)}</p>
          </SidebarField>
        </div>
      </aside>

    </div>
  )
}
