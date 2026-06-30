import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import TicketDetailPage from './TicketDetailPage'
import { renderWithQuery } from '../test/render-with-query'

vi.mock('axios')

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: () => ({ id: 'ticket-abc-123' }) }
})

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: 'Admin', role: 'admin' } } }),
    signOut: vi.fn(),
  },
}))

const TICKET_ID = 'ticket-abc-123'

const MOCK_TICKET = {
  id: TICKET_ID,
  subject: 'Cannot access student portal',
  body: 'I cannot log in to the student portal.',
  status: 'open',
  priority: 'high',
  category: 'technical_it',
  from_email: 'student@example.com',
  from_name: 'Jane Student',
  thread_id: null,
  assignee_id: null,
  ai_summary: null,
  ai_draft_reply: null,
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
}

const MOCK_AGENTS = [
  { id: 'agent-1', name: 'Alice Agent', email: 'alice@example.com' },
  { id: 'agent-2', name: 'Bob Agent', email: 'bob@example.com' },
]

const MOCK_REPLIES = [
  {
    id: 'reply-1',
    ticket_id: TICKET_ID,
    sender_type: 'agent',
    author: { id: 'agent-1', name: 'Alice Agent' },
    body: 'We are looking into this.',
    created_at: '2026-06-01T11:00:00Z',
  },
]

function mockGetByUrl(overrides: { ticket?: object; agents?: object[]; replies?: object[] } = {}) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes('/api/users/agents'))
      return Promise.resolve({ data: overrides.agents ?? MOCK_AGENTS })
    if (url.includes('/replies'))
      return Promise.resolve({ data: overrides.replies ?? [] })
    return Promise.resolve({ data: overrides.ticket ?? MOCK_TICKET })
  })
}

const renderPage = () => renderWithQuery(<TicketDetailPage />)

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetByUrl()
    vi.mocked(axios.patch).mockResolvedValue({ data: MOCK_TICKET })
    vi.mocked(axios.post).mockResolvedValue({ data: MOCK_REPLIES[0] })
  })

  it('shows skeletons while loading', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Cannot access student portal')).not.toBeInTheDocument()
  })

  it('renders ticket subject and metadata after load', async () => {
    renderPage()
    await screen.findByText('Cannot access student portal')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('open')
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Jane Student')).toBeInTheDocument()
    expect(screen.getByText('student@example.com')).toBeInTheDocument()
  })

  it('shows an error message when the ticket fetch fails', async () => {
    const err = Object.assign(new Error('Not found'), {
      isAxiosError: true,
      response: { data: { detail: 'Ticket not found' } },
    })
    vi.mocked(axios.get).mockRejectedValue(err)
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    renderPage()
    expect(await screen.findByText('Ticket not found')).toBeInTheDocument()
  })

  describe('status dropdown', () => {
    it('shows the current ticket status', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('open')
    })

    it('calls PATCH with the new status when changed', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')

      fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
        target: { value: 'resolved' },
      })

      await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}`,
          { status: 'resolved' },
          { withCredentials: true },
        )
      })
    })

    it('disables status and category selects while mutation is in flight', async () => {
      vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}))
      renderPage()
      await screen.findByText('Cannot access student portal')

      const statusSelect = screen.getByRole('combobox', { name: 'Status' })
      fireEvent.change(statusSelect, { target: { value: 'resolved' } })

      await waitFor(() => expect(statusSelect).toBeDisabled())
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled()
    })
  })

  describe('category dropdown', () => {
    it('shows the current ticket category', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('technical_it')
    })

    it('calls PATCH with the new category when changed', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')

      fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
        target: { value: 'billing_fees' },
      })

      await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}`,
          { category: 'billing_fees' },
          { withCredentials: true },
        )
      })
    })
  })

  describe('assign dropdown', () => {
    it('lists all agents plus an Unassigned option', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')

      expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Bob Agent' })).toBeInTheDocument()
    })

    it('defaults to Unassigned when ticket has no assignee', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(screen.getByRole('combobox', { name: 'Assigned to' })).toHaveValue('')
    })

    it('shows the current assignee as selected', async () => {
      mockGetByUrl({ ticket: { ...MOCK_TICKET, assignee_id: 'agent-2' } })
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(screen.getByRole('combobox', { name: 'Assigned to' })).toHaveValue('agent-2')
    })

    it('calls PATCH with the chosen agent id when an agent is selected', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')

      fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), {
        target: { value: 'agent-1' },
      })

      await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/assign`,
          { assignee_id: 'agent-1' },
          { withCredentials: true },
        )
      })
    })

    it('calls PATCH with null when Unassigned is selected', async () => {
      mockGetByUrl({ ticket: { ...MOCK_TICKET, assignee_id: 'agent-1' } })
      renderPage()
      await screen.findByText('Cannot access student portal')

      fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), {
        target: { value: '' },
      })

      await waitFor(() => {
        expect(axios.patch).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/assign`,
          { assignee_id: null },
          { withCredentials: true },
        )
      })
    })

    it('disables the assign dropdown while the assign mutation is in flight', async () => {
      vi.mocked(axios.patch).mockReturnValue(new Promise(() => {}))
      renderPage()
      await screen.findByText('Cannot access student portal')

      const assignSelect = screen.getByRole('combobox', { name: 'Assigned to' })
      fireEvent.change(assignSelect, { target: { value: 'agent-1' } })

      await waitFor(() => expect(assignSelect).toBeDisabled())
    })
  })

  describe('reply thread', () => {
    it('shows "No replies yet" when there are no replies', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
    })

    it('renders existing replies with author name and body', async () => {
      mockGetByUrl({ replies: MOCK_REPLIES })
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(await screen.findByText('We are looking into this.')).toBeInTheDocument()
      expect(screen.getAllByText('Alice Agent').length).toBeGreaterThan(0)
    })

    it('posts a new reply and shows it in the thread', async () => {
      const newReply = {
        id: 'reply-2',
        ticket_id: TICKET_ID,
        sender_type: 'agent',
        author: { id: 'agent-2', name: 'Bob Agent' },
        body: 'Issue has been resolved.',
        created_at: '2026-06-01T12:00:00Z',
      }
      vi.mocked(axios.post).mockResolvedValue({ data: newReply })
      renderPage()
      await screen.findByText('Cannot access student portal')

      const textarea = screen.getByPlaceholderText(/Write a reply/)
      fireEvent.change(textarea, { target: { value: 'Issue has been resolved.' } })
      fireEvent.click(screen.getByRole('button', { name: /send reply/i }))

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/replies`,
          { body: 'Issue has been resolved.' },
          { withCredentials: true },
        )
      })
      expect(await screen.findByText('Issue has been resolved.')).toBeInTheDocument()
    })

    it('disables Send Reply when textarea is empty', async () => {
      renderPage()
      await screen.findByText('Cannot access student portal')
      expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled()
    })

    describe('reply form', () => {
      const getTextarea = () => screen.getByPlaceholderText(/Write a reply/)
      const getSendBtn = () => screen.getByRole('button', { name: /send reply/i })

      it('submits via Enter key', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: MOCK_REPLIES[0] })
        renderPage()
        await screen.findByText('Cannot access student portal')

        const textarea = getTextarea()
        fireEvent.change(textarea, { target: { value: 'Sent with Enter.' } })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

        await waitFor(() => {
          expect(axios.post).toHaveBeenCalledWith(
            `/api/tickets/${TICKET_ID}/replies`,
            { body: 'Sent with Enter.' },
            { withCredentials: true },
          )
        })
      })

      it('does not submit on Shift+Enter', async () => {
        renderPage()
        await screen.findByText('Cannot access student portal')

        const textarea = getTextarea()
        fireEvent.change(textarea, { target: { value: 'Multi-line.' } })
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

        expect(axios.post).not.toHaveBeenCalled()
      })

      it('clears the textarea after successful submission', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: MOCK_REPLIES[0] })
        renderPage()
        await screen.findByText('Cannot access student portal')

        const textarea = getTextarea()
        fireEvent.change(textarea, { target: { value: 'Hello.' } })
        fireEvent.click(getSendBtn())

        await waitFor(() => expect(textarea).toHaveValue(''))
      })

      it('disables the button while the POST is in flight', async () => {
        vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
        renderPage()
        await screen.findByText('Cannot access student portal')

        fireEvent.change(getTextarea(), { target: { value: 'Sending…' } })
        const btn = getSendBtn()
        fireEvent.click(btn)

        await waitFor(() => expect(btn).toBeDisabled())
      })

      it('keeps Send Reply disabled for whitespace-only input', async () => {
        renderPage()
        await screen.findByText('Cannot access student portal')

        fireEvent.change(getTextarea(), { target: { value: '   ' } })
        expect(getSendBtn()).toBeDisabled()
      })

      it('shows an inline error when the POST fails', async () => {
        const err = Object.assign(new Error('Server error'), {
          isAxiosError: true,
          response: { data: { detail: 'Reply body cannot be empty' } },
        })
        vi.mocked(axios.post).mockRejectedValue(err)
        vi.mocked(axios.isAxiosError).mockReturnValue(true)

        renderPage()
        await screen.findByText('Cannot access student portal')

        fireEvent.change(getTextarea(), { target: { value: 'Hello.' } })
        fireEvent.click(getSendBtn())

        expect(await screen.findByText('Reply body cannot be empty')).toBeInTheDocument()
      })
    })

    describe('sender type display', () => {
      it('shows an Agent badge for agent replies', async () => {
        mockGetByUrl({ replies: MOCK_REPLIES })
        renderPage()
        await screen.findByText('We are looking into this.')
        expect(screen.getAllByText('Agent').length).toBeGreaterThan(0)
      })

      it('shows Customer as the sender name and badge for customer replies', async () => {
        mockGetByUrl({
          replies: [{
            id: 'reply-c1',
            ticket_id: TICKET_ID,
            sender_type: 'customer',
            author: null,
            body: 'Still having issues.',
            created_at: '2026-06-01T12:00:00Z',
          }],
        })
        renderPage()
        await screen.findByText('Still having issues.')
        expect(screen.getAllByText('Customer').length).toBeGreaterThanOrEqual(2)
      })

      it('shows the reply count in the section heading', async () => {
        mockGetByUrl({ replies: MOCK_REPLIES })
        renderPage()
        expect(await screen.findByText(/Reply Thread \(1\)/)).toBeInTheDocument()
      })
    })
  })
})
