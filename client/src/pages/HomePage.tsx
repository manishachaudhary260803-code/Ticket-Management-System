import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { TooltipContentProps } from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import Navbar from "../components/Navbar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  total_tickets: number
  open_tickets: number
  resolved_by_ai_count: number
  resolved_by_ai_percent: number
  avg_resolution_time_seconds: number | null
}

interface DailyTicketCount {
  date: string
  count: number
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await axios.get<DashboardStats>("/api/dashboard/stats", { withCredentials: true })
  return res.data
}

async function fetchTicketsPerDay(): Promise<DailyTicketCount[]> {
  const res = await axios.get<DailyTicketCount[]>("/api/dashboard/tickets-per-day", { withCredentials: true })
  return res.data
}

function formatShortDate(iso: string): string {
  // Parse "YYYY-MM-DD" as local components — new Date(iso) would parse it as
  // UTC midnight, which can shift the displayed day off by one in some timezones.
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—"
  const hours = seconds / 3600
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-t-2 border-t-brass">
      <CardHeader>
        <CardTitle className="section-label text-ink-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-mono font-medium text-navy">{value}</p>
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload as DailyTicketCount
  const count = point.count

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-mono font-medium text-ink">{formatShortDate(point.date)}</p>
      <p className="text-xs text-ink-muted mt-0.5">
        {count} ticket{count === 1 ? "" : "s"} created
      </p>
    </div>
  )
}

function TicketVolumeChart({ data }: { data: DailyTicketCount[] }) {
  // Show roughly 8 date labels across the range so they don't overlap.
  const tickInterval = Math.max(0, Math.ceil(data.length / 8) - 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="section-label text-ink-muted">Tickets per Day (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Bar chart of tickets created per day over the last 30 days">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8DCD3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                interval={tickInterval}
                angle={-35}
                textAnchor="end"
                height={50}
                tick={{ fontSize: 11, fill: "#5B655F", fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={{ stroke: "#D8DCD3" }}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B655F", fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={ChartTooltip} cursor={{ fill: "#1B3A5C", fillOpacity: 0.06 }} />
              <Bar dataKey="count" fill="#1B3A5C" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  })
  const { data: dailyCounts, isLoading: isChartLoading } = useQuery({
    queryKey: ["dashboard-tickets-per-day"],
    queryFn: fetchTicketsPerDay,
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="section-label text-brass-dark mb-1">Front Desk Overview</p>
        <h2 className="font-display italic text-3xl text-ink">Dashboard</h2>

        {isLoading && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Tickets" value={stats.total_tickets} />
            <StatCard label="Open Tickets" value={stats.open_tickets} />
            <StatCard label="Resolved by AI" value={stats.resolved_by_ai_count} />
            <StatCard label="% Resolved by AI" value={`${stats.resolved_by_ai_percent}%`} />
            <StatCard label="Avg. Resolution Time" value={formatDuration(stats.avg_resolution_time_seconds)} />
          </div>
        )}

        {isChartLoading && <Skeleton className="mt-4 h-56 rounded-xl" />}
        {dailyCounts && (
          <div className="mt-4">
            <TicketVolumeChart data={dailyCounts} />
          </div>
        )}
      </main>
    </div>
  )
}
