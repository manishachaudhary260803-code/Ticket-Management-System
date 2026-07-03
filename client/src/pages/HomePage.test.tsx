import { screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import HomePage from './HomePage'
import { renderWithQuery } from '../test/render-with-query'

vi.mock('axios')
vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { name: 'Admin', role: 'admin' } },
    }),
    signOut: vi.fn(),
  },
}))

const MOCK_STATS = {
  total_tickets: 42,
  open_tickets: 10,
  resolved_by_ai_count: 8,
  resolved_by_ai_percent: 19.0,
  avg_resolution_time_seconds: 7200,
}

const MOCK_DAILY_COUNTS = [
  { date: '2026-06-30', count: 3 },
  { date: '2026-07-01', count: 7 },
]

function mockApis(overrides: { stats?: object; dailyCounts?: object[] } = {}) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes('/tickets-per-day'))
      return Promise.resolve({ data: overrides.dailyCounts ?? MOCK_DAILY_COUNTS })
    return Promise.resolve({ data: overrides.stats ?? MOCK_STATS })
  })
}

const renderPage = () => renderWithQuery(<HomePage />)

describe('HomePage', () => {
  beforeEach(() => {
    mockApis()
  })

  it('shows skeletons while loading', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    // 5 stat card skeletons + 1 chart skeleton
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(6)
    expect(screen.queryByText('Total Tickets')).not.toBeInTheDocument()
  })

  it('renders dashboard stats after data loads', async () => {
    renderPage()

    expect(await screen.findByText('Total Tickets')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Open Tickets')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Resolved by AI')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('% Resolved by AI')).toBeInTheDocument()
    expect(screen.getByText('19%')).toBeInTheDocument()
    expect(screen.getByText('Avg. Resolution Time')).toBeInTheDocument()
    expect(screen.getByText('2.0h')).toBeInTheDocument()
  })

  it('formats resolution time under an hour in minutes', async () => {
    mockApis({ stats: { ...MOCK_STATS, avg_resolution_time_seconds: 300 } })
    renderPage()
    expect(await screen.findByText('5m')).toBeInTheDocument()
  })

  it('shows a dash when there is no resolution data yet', async () => {
    mockApis({ stats: { ...MOCK_STATS, avg_resolution_time_seconds: null } })
    renderPage()
    expect(await screen.findByText('—')).toBeInTheDocument()
  })

  it('renders a bar chart of tickets per day', async () => {
    renderPage()

    expect(await screen.findByText('Tickets per Day (Last 30 Days)')).toBeInTheDocument()
    const chart = screen.getByRole('img', { name: /bar chart of tickets created per day/i })
    expect(chart).toBeInTheDocument()
    // recharts' ResponsiveContainer measures 0x0 in jsdom (no ResizeObserver-driven
    // layout), so we only assert the chart mounted, not that bars/axes rendered.
    expect(chart.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })
})
