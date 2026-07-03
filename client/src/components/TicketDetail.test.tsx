import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import TicketDetail from './TicketDetail'
import { renderWithQuery } from '../test/render-with-query'

vi.mock('axios')

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: 'Agent', role: 'agent' } } }),
    signOut: vi.fn(),
  },
}))

const TICKET_ID = 'ticket-unit-001'

const BASE_TICKET = {
  id: TICKET_ID,
  subject: 'Billing invoice question',
  body: 'I have a question about my invoice.',
  status: 'open',
  priority: 'medium',
  category: 'billing_fees',
  from_email: 'student@uni.edu',
  from_name: 'John Doe',
  thread_id: null,
  assignee_id: null,
  ai_summary: null,
  ai_draft_reply: null,
  created_at: '2026-06-15T09:00:00Z',
  updated_at: '2026-06-20T14:30:00Z',
}

const AGENTS = [
  { id: 'agent-1', name: 'Alice Agent', email: 'alice@example.com' },
  { id: 'agent-2', name: 'Bob Agent', email: 'bob@example.com' },
]

const AGENT_REPLY = {
  id: 'reply-a1',
  ticket_id: TICKET_ID,
  sender_type: 'agent',
  author: { id: 'agent-1', name: 'Alice Agent' },
  body: 'We are reviewing your invoice.',
  created_at: '2026-06-16T10:00:00Z',
}

const CUSTOMER_REPLY = {
  id: 'reply-c1',
  ticket_id: TICKET_ID,
  sender_type: 'customer',
  author: null,
  body: 'Thank you for the quick response.',
  created_at: '2026-06-16T11:00:00Z',
}

function mockApis(overrides: {
  ticket?: object
  agents?: object[]
  replies?: object[]
} = {}) {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes('/api/users/agents'))
      return Promise.resolve({ data: overrides.agents ?? AGENTS })
    if (url.includes('/replies'))
      return Promise.resolve({ data: overrides.replies ?? [] })
    return Promise.resolve({ data: overrides.ticket ?? BASE_TICKET })
  })
}

const render = () => renderWithQuery(<TicketDetail id={TICKET_ID} />)

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApis()
    vi.mocked(axios.patch).mockResolvedValue({ data: BASE_TICKET })
    vi.mocked(axios.post).mockResolvedValue({ data: AGENT_REPLY })
  })

  // ── loading & error ──────────────────────────────────────────────────────

  it('renders skeletons while loading', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {}))
    render()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Billing invoice question')).not.toBeInTheDocument()
  })

  it('shows the error detail from a failed ticket fetch', async () => {
    const err = Object.assign(new Error('Not found'), {
      isAxiosError: true,
      response: { data: { detail: 'Ticket does not exist' } },
    })
    vi.mocked(axios.get).mockRejectedValue(err)
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render()
    expect(await screen.findByText('Ticket does not exist')).toBeInTheDocument()
  })

  it('falls back to the error message when response has no detail', async () => {
    const err = Object.assign(new Error('Network Error'), { isAxiosError: true, response: undefined })
    vi.mocked(axios.get).mockRejectedValue(err)
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render()
    expect(await screen.findByText('Network Error')).toBeInTheDocument()
  })

  // ── ticket content display ───────────────────────────────────────────────

  it('renders the ticket subject', async () => {
    render()
    expect(await screen.findByText('Billing invoice question')).toBeInTheDocument()
  })

  it('renders the short ticket ID prefix below the subject', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText(`#${TICKET_ID.slice(0, 8).toUpperCase()}`)).toBeInTheDocument()
  })

  it('displays from_name and from_email when both are present', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('student@uni.edu')).toBeInTheDocument()
  })

  it('displays only from_email when from_name is null', async () => {
    mockApis({ ticket: { ...BASE_TICKET, from_name: null } })
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('student@uni.edu')).toBeInTheDocument()
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('renders the email body in a pre element', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('I have a question about my invoice.')).toBeInTheDocument()
  })

  // ── AI sections ──────────────────────────────────────────────────────────

  it('does not render the AI Summary section when ai_summary is null', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.queryByText('AI Summary')).not.toBeInTheDocument()
  })

  it('renders the AI Summary section when ai_summary is present', async () => {
    mockApis({ ticket: { ...BASE_TICKET, ai_summary: 'Student is confused about a billing charge.' } })
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('AI Summary')).toBeInTheDocument()
    expect(screen.getByText('Student is confused about a billing charge.')).toBeInTheDocument()
  })

  it('does not render the AI Draft Reply section when ai_draft_reply is null', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.queryByText('AI Draft Reply')).not.toBeInTheDocument()
  })

  it('renders the AI Draft Reply section when ai_draft_reply is present', async () => {
    mockApis({ ticket: { ...BASE_TICKET, ai_draft_reply: 'Dear student, your invoice shows...' } })
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('AI Draft Reply')).toBeInTheDocument()
    expect(screen.getByText('Dear student, your invoice shows...')).toBeInTheDocument()
  })

  // ── sidebar: priority display ────────────────────────────────────────────

  it('displays "Medium" priority label', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('displays "High" priority label', async () => {
    mockApis({ ticket: { ...BASE_TICKET, priority: 'high' } })
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('displays "Low" priority label', async () => {
    mockApis({ ticket: { ...BASE_TICKET, priority: 'low' } })
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  // ── sidebar: dates ───────────────────────────────────────────────────────

  it('shows the Received and Last Updated dates', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('Last Updated')).toBeInTheDocument()
  })

  // ── sidebar: status & category selects ──────────────────────────────────

  it('shows the current status in the select', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('open')
  })

  it('shows the current category in the select', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('billing_fees')
  })

  it('calls PATCH /tickets/:id with updated status', async () => {
    render()
    await screen.findByText('Billing invoice question')

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'in_progress' },
    })

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}`,
        { status: 'in_progress' },
        { withCredentials: true },
      ),
    )
  })

  it('calls PATCH /tickets/:id with updated category', async () => {
    render()
    await screen.findByText('Billing invoice question')

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'other' },
    })

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}`,
        { category: 'other' },
        { withCredentials: true },
      ),
    )
  })

  // ── sidebar: assign dropdown ─────────────────────────────────────────────

  it('populates the assign select with agents and an Unassigned option', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bob Agent' })).toBeInTheDocument()
  })

  it('calls PATCH /tickets/:id/assign with the agent id', async () => {
    render()
    await screen.findByText('Billing invoice question')

    fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), {
      target: { value: 'agent-1' },
    })

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/assign`,
        { assignee_id: 'agent-1' },
        { withCredentials: true },
      ),
    )
  })

  it('calls PATCH /tickets/:id/assign with null when Unassigned is selected', async () => {
    mockApis({ ticket: { ...BASE_TICKET, assignee_id: 'agent-2' } })
    render()
    await screen.findByText('Billing invoice question')

    fireEvent.change(screen.getByRole('combobox', { name: 'Assigned to' }), {
      target: { value: '' },
    })

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/tickets/${TICKET_ID}/assign`,
        { assignee_id: null },
        { withCredentials: true },
      ),
    )
  })

  // ── reply thread display ─────────────────────────────────────────────────

  it('shows "No replies yet." when the thread is empty', async () => {
    render()
    await screen.findByText('Billing invoice question')
    expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
  })

  it('shows the reply count in the heading', async () => {
    mockApis({ replies: [AGENT_REPLY, CUSTOMER_REPLY] })
    render()
    expect(await screen.findByText(/Reply Thread \(2\)/)).toBeInTheDocument()
  })

  it('renders agent reply with author name and Agent badge', async () => {
    mockApis({ replies: [AGENT_REPLY] })
    render()
    await screen.findByText('We are reviewing your invoice.')
    expect(screen.getAllByText('Agent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Alice Agent').length).toBeGreaterThan(0)
  })

  it('renders customer reply with Customer label and badge', async () => {
    mockApis({ replies: [CUSTOMER_REPLY] })
    render()
    await screen.findByText('Thank you for the quick response.')
    expect(screen.getAllByText('Customer').length).toBeGreaterThanOrEqual(2)
  })

  it('renders agent reply with fallback "Agent" when author is null', async () => {
    mockApis({
      replies: [{ ...AGENT_REPLY, author: null }],
    })
    render()
    await screen.findByText('We are reviewing your invoice.')
    expect(screen.getAllByText('Agent').length).toBeGreaterThan(0)
  })

  it('renders multiple replies in order', async () => {
    mockApis({ replies: [AGENT_REPLY, CUSTOMER_REPLY] })
    render()
    await screen.findByText('We are reviewing your invoice.')
    expect(screen.getByText('Thank you for the quick response.')).toBeInTheDocument()
    const bodies = screen.getAllByText(/reviewing|quick response/)
    expect(bodies[0]).toHaveTextContent('We are reviewing your invoice.')
    expect(bodies[1]).toHaveTextContent('Thank you for the quick response.')
  })

  // ── reply form ────────────────────────────────────────────────────────────

  describe('reply form', () => {
    const getTextarea = () => screen.getByPlaceholderText(/Write a reply/)
    const getSendBtn = () => screen.getByRole('button', { name: /send reply/i })

    it('disables the Send Reply button when textarea is empty', async () => {
      render()
      await screen.findByText('Billing invoice question')
      expect(getSendBtn()).toBeDisabled()
    })

    it('disables the Send Reply button for whitespace-only input', async () => {
      render()
      await screen.findByText('Billing invoice question')
      fireEvent.change(getTextarea(), { target: { value: '   ' } })
      expect(getSendBtn()).toBeDisabled()
    })

    it('enables the Send Reply button when text is entered', async () => {
      render()
      await screen.findByText('Billing invoice question')
      fireEvent.change(getTextarea(), { target: { value: 'Hello' } })
      expect(getSendBtn()).not.toBeDisabled()
    })

    it('POSTs to /tickets/:id/replies with the body', async () => {
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Your issue is resolved.' } })
      fireEvent.click(getSendBtn())

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/replies`,
          { body: 'Your issue is resolved.' },
          { withCredentials: true },
        ),
      )
    })

    it('clears the textarea after a successful submission', async () => {
      render()
      await screen.findByText('Billing invoice question')

      const textarea = getTextarea()
      fireEvent.change(textarea, { target: { value: 'Done!' } })
      fireEvent.click(getSendBtn())

      await waitFor(() => expect(textarea).toHaveValue(''))
    })

    it('appends the new reply to the thread on success', async () => {
      const newReply = {
        id: 'reply-new',
        ticket_id: TICKET_ID,
        sender_type: 'agent',
        author: { id: 'agent-2', name: 'Bob Agent' },
        body: 'We have resolved the billing issue.',
        created_at: '2026-06-17T09:00:00Z',
      }
      vi.mocked(axios.post).mockResolvedValue({ data: newReply })
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'We have resolved the billing issue.' } })
      fireEvent.click(getSendBtn())

      expect(await screen.findByText('We have resolved the billing issue.')).toBeInTheDocument()
    })

    it('submits via Enter key (without Shift)', async () => {
      render()
      await screen.findByText('Billing invoice question')

      const textarea = getTextarea()
      fireEvent.change(textarea, { target: { value: 'Pressing Enter.' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          `/api/tickets/${TICKET_ID}/replies`,
          { body: 'Pressing Enter.' },
          { withCredentials: true },
        ),
      )
    })

    it('does not submit on Shift+Enter', async () => {
      render()
      await screen.findByText('Billing invoice question')

      const textarea = getTextarea()
      fireEvent.change(textarea, { target: { value: 'Multi\nline.' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(axios.post).not.toHaveBeenCalled()
    })

    it('disables the Send button while the POST is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Hello.' } })
      const btn = screen.getByRole('button', { name: /send reply/i })
      fireEvent.click(btn)

      await waitFor(() => expect(btn).toBeDisabled())
    })

    it('shows button label as "Sending…" while the POST is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Hello.' } })
      fireEvent.click(getSendBtn())

      await waitFor(() => expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument())
    })

    it('shows an inline error message when the POST fails', async () => {
      const err = Object.assign(new Error('Server error'), {
        isAxiosError: true,
        response: { data: { detail: 'Reply body cannot be empty' } },
      })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(true)

      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: '.' } })
      fireEvent.click(getSendBtn())

      expect(await screen.findByText('Reply body cannot be empty')).toBeInTheDocument()
    })

    it('shows a generic error message when the POST fails without a detail field', async () => {
      const err = Object.assign(new Error('Unexpected'), { isAxiosError: true, response: undefined })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: '.' } })
      fireEvent.click(getSendBtn())

      expect(await screen.findByText('Failed to send reply')).toBeInTheDocument()
    })
  })

  // ── summarize feature ─────────────────────────────────────────────────────

  describe('summarize feature', () => {
    const getSummarizeBtn = () => screen.getByRole('button', { name: /summarize|re-summarize/i })

    function mockPostForSummarize(summaryText = 'The student had a billing question. The agent is reviewing it.') {
      vi.mocked(axios.post).mockImplementation((url: string) => {
        if (url.includes('/summarize'))
          return Promise.resolve({ data: { summary: summaryText } })
        return Promise.resolve({ data: AGENT_REPLY })
      })
    }

    it('renders the Summarize button', async () => {
      render()
      await screen.findByText('Billing invoice question')
      expect(getSummarizeBtn()).toBeInTheDocument()
    })

    it('Summarize button is enabled even with no replies', async () => {
      render()
      await screen.findByText('Billing invoice question')
      expect(getSummarizeBtn()).not.toBeDisabled()
    })

    it('POSTs to /api/auth/ai/summarize with ticket subject, body, and replies', async () => {
      mockApis({ replies: [AGENT_REPLY] })
      mockPostForSummarize()
      render()
      // wait for both ticket and replies to load
      await screen.findByText('We are reviewing your invoice.')

      fireEvent.click(getSummarizeBtn())

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ai/summarize',
          {
            ticket_subject: 'Billing invoice question',
            ticket_body: 'I have a question about my invoice.',
            replies: [
              {
                sender_type: 'agent',
                author_name: 'Alice Agent',
                body: 'We are reviewing your invoice.',
              },
            ],
          },
          { withCredentials: true },
        ),
      )
    })

    it('displays the summary in a Conversation Summary section after clicking', async () => {
      mockPostForSummarize('The student had a billing question. The agent is reviewing it.')
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.click(getSummarizeBtn())

      expect(await screen.findByText('Conversation Summary')).toBeInTheDocument()
      expect(await screen.findByText('The student had a billing question. The agent is reviewing it.')).toBeInTheDocument()
    })

    it('changes button label to "Re-summarize" after first summary is generated', async () => {
      mockPostForSummarize()
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.click(getSummarizeBtn())
      await screen.findByText('Conversation Summary')

      expect(screen.getByRole('button', { name: /re-summarize/i })).toBeInTheDocument()
    })

    it('shows "Summarizing…" while the request is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.click(getSummarizeBtn())

      await waitFor(() => expect(screen.getByRole('button', { name: /summarizing/i })).toBeInTheDocument())
    })

    it('disables the Summarize button while the request is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      const btn = getSummarizeBtn()
      fireEvent.click(btn)

      await waitFor(() => expect(btn).toBeDisabled())
    })

    it('replaces the summary with a new one on re-click', async () => {
      mockPostForSummarize('First summary.')
      render()
      await screen.findByText('Billing invoice question')
      fireEvent.click(getSummarizeBtn())
      await screen.findByText('First summary.')

      vi.mocked(axios.post).mockImplementation((url: string) => {
        if (url.includes('/summarize'))
          return Promise.resolve({ data: { summary: 'Updated summary.' } })
        return Promise.resolve({ data: AGENT_REPLY })
      })
      fireEvent.click(getSummarizeBtn())

      expect(await screen.findByText('Updated summary.')).toBeInTheDocument()
      expect(screen.queryByText('First summary.')).not.toBeInTheDocument()
    })

    it('shows an inline error when the summarize request fails with an API error', async () => {
      const err = Object.assign(new Error('AI error'), {
        isAxiosError: true,
        response: { data: { error: 'AI service unavailable' } },
      })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(true)

      render()
      await screen.findByText('Billing invoice question')
      fireEvent.click(getSummarizeBtn())

      expect(await screen.findByText('AI service unavailable')).toBeInTheDocument()
    })

    it('shows a generic error when the summarize request fails without a detail field', async () => {
      const err = Object.assign(new Error('Network error'), { isAxiosError: false })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      render()
      await screen.findByText('Billing invoice question')
      fireEvent.click(getSummarizeBtn())

      expect(await screen.findByText('Failed to summarize conversation')).toBeInTheDocument()
    })

    it('clears the error when a subsequent summarize request succeeds', async () => {
      const err = Object.assign(new Error('fail'), { isAxiosError: false })
      vi.mocked(axios.post).mockRejectedValueOnce(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      render()
      await screen.findByText('Billing invoice question')
      fireEvent.click(getSummarizeBtn())
      await screen.findByText('Failed to summarize conversation')

      mockPostForSummarize('All good now.')
      fireEvent.click(getSummarizeBtn())

      await waitFor(() => expect(screen.queryByText('Failed to summarize conversation')).not.toBeInTheDocument())
      expect(await screen.findByText('All good now.')).toBeInTheDocument()
    })
  })

  // ── polish feature ────────────────────────────────────────────────────────

  describe('polish feature', () => {
    const getTextarea = () => screen.getByPlaceholderText(/Write a reply/)
    const getPolishBtn = () => screen.getByRole('button', { name: /polish/i })
    const getSendBtn = () => screen.getByRole('button', { name: /send reply/i })

    function mockPostForPolish(polishedText = 'Polished reply text.') {
      vi.mocked(axios.post).mockImplementation((url: string) => {
        if (url.includes('/polish-reply'))
          return Promise.resolve({ data: { polished: polishedText } })
        return Promise.resolve({ data: AGENT_REPLY })
      })
    }

    it('renders the Polish button', async () => {
      render()
      await screen.findByText('Billing invoice question')
      expect(getPolishBtn()).toBeInTheDocument()
    })

    it('disables the Polish button when the textarea is empty', async () => {
      render()
      await screen.findByText('Billing invoice question')
      expect(getPolishBtn()).toBeDisabled()
    })

    it('disables the Polish button for whitespace-only input', async () => {
      render()
      await screen.findByText('Billing invoice question')
      fireEvent.change(getTextarea(), { target: { value: '   ' } })
      expect(getPolishBtn()).toBeDisabled()
    })

    it('enables the Polish button when the textarea has text', async () => {
      render()
      await screen.findByText('Billing invoice question')
      fireEvent.change(getTextarea(), { target: { value: 'Hello' } })
      expect(getPolishBtn()).not.toBeDisabled()
    })

    it('POSTs to /api/auth/ai/polish-reply with draft, agent_name, and customer_first_name', async () => {
      mockPostForPolish()
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Please check your invoice.' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ai/polish-reply',
          {
            draft: 'Please check your invoice.',
            agent_name: 'Agent',
            customer_first_name: 'John',
          },
          { withCredentials: true },
        ),
      )
    })

    it('sends only the first name from from_name', async () => {
      mockApis({ ticket: { ...BASE_TICKET, from_name: 'Jane Smith' } })
      mockPostForPolish()
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Hi there.' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ai/polish-reply',
          expect.objectContaining({ customer_first_name: 'Jane' }),
          expect.anything(),
        ),
      )
    })

    it('sends undefined customer_first_name when from_name is null', async () => {
      mockApis({ ticket: { ...BASE_TICKET, from_name: null } })
      mockPostForPolish()
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'Hi there.' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ai/polish-reply',
          expect.objectContaining({ customer_first_name: undefined }),
          expect.anything(),
        ),
      )
    })

    it('replaces the textarea content with the polished text', async () => {
      mockPostForPolish('This is the improved reply.')
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'rough draft' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() => expect(getTextarea()).toHaveValue('This is the improved reply.'))
    })

    it('shows "Polishing…" on the button while the request is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() => expect(screen.getByRole('button', { name: /polishing/i })).toBeInTheDocument())
    })

    it('disables the Polish button while the request is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      const btn = getPolishBtn()
      fireEvent.click(btn)

      await waitFor(() => expect(btn).toBeDisabled())
    })

    it('disables the Send Reply button while polishing is in flight', async () => {
      vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      fireEvent.click(getPolishBtn())

      await waitFor(() => expect(getSendBtn()).toBeDisabled())
    })

    it('shows an inline error when the polish request fails with an API error', async () => {
      const err = Object.assign(new Error('AI error'), {
        isAxiosError: true,
        response: { data: { error: 'AI service unavailable' } },
      })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(true)

      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      fireEvent.click(getPolishBtn())

      expect(await screen.findByText('AI service unavailable')).toBeInTheDocument()
    })

    it('shows a generic error when the polish request fails without a detail field', async () => {
      const err = Object.assign(new Error('Network error'), { isAxiosError: false })
      vi.mocked(axios.post).mockRejectedValue(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      render()
      await screen.findByText('Billing invoice question')

      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      fireEvent.click(getPolishBtn())

      expect(await screen.findByText('Failed to polish reply')).toBeInTheDocument()
    })

    it('clears the polish error when a new polish request is started', async () => {
      const err = Object.assign(new Error('fail'), { isAxiosError: false })
      vi.mocked(axios.post).mockRejectedValueOnce(err)
      vi.mocked(axios.isAxiosError).mockReturnValue(false)

      render()
      await screen.findByText('Billing invoice question')
      fireEvent.change(getTextarea(), { target: { value: 'draft' } })
      fireEvent.click(getPolishBtn())
      await screen.findByText('Failed to polish reply')

      // second attempt succeeds — error should disappear
      vi.mocked(axios.post).mockImplementation((url: string) => {
        if (url.includes('/polish-reply'))
          return Promise.resolve({ data: { polished: 'Better reply.' } })
        return Promise.resolve({ data: AGENT_REPLY })
      })
      fireEvent.click(getPolishBtn())

      await waitFor(() => expect(screen.queryByText('Failed to polish reply')).not.toBeInTheDocument())
    })
  })
})
