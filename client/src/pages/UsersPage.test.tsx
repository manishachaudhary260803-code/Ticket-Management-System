import { screen, waitForElementToBeRemoved, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import UsersPage from './UsersPage'
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

const MOCK_USERS = [
  {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'admin',
    email_verified: true,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Bob Agent',
    email: 'bob@example.com',
    role: 'agent',
    email_verified: false,
    created_at: '2026-03-20T09:00:00Z',
  },
]

const renderPage = () => renderWithQuery(<UsersPage />)

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockResolvedValue({ data: MOCK_USERS })
  })

  it('shows skeleton rows while loading', () => {
    vi.mocked(axios.get).mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    // 5 skeleton rows × 4 cells each
    expect(document.querySelectorAll('tbody tr')).toHaveLength(5)
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument()
  })

  it('renders user rows after data loads', async () => {
    renderPage()
    await waitForElementToBeRemoved(() =>
      document.querySelector('[data-slot="skeleton"]')
    )
    expect(screen.getByText('Alice Admin')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Agent')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows admin badge in navy and agent badge in neutral', async () => {
    renderPage()
    await screen.findByText('Alice Admin')

    const adminBadge = screen.getByText('admin')
    expect(adminBadge).toHaveClass('bg-navy')

    const agentBadge = screen.getByText('agent')
    expect(agentBadge).toHaveClass('bg-secondary')
  })

  it('formats the joined date', async () => {
    renderPage()
    await screen.findByText('Alice Admin')
    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 20, 2026')).toBeInTheDocument()
  })

  it('shows error message when request fails', async () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { detail: 'Admin access required' } },
    })
    vi.mocked(axios.get).mockRejectedValue(axiosError)
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    renderPage()
    expect(await screen.findByText('Admin access required')).toBeInTheDocument()
  })

  it('shows "No users found" when list is empty', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] })
    renderPage()
    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  describe('Add User modal', () => {
    async function openModal() {
      renderPage()
      await screen.findByText('Alice Admin')
      await userEvent.click(screen.getByRole('button', { name: 'Add User' }))
    }

    it('shows the modal when "Add User" is clicked', async () => {
      await openModal()
      expect(screen.getByRole('heading', { name: 'Add User' })).toBeInTheDocument()
    })

    it('hides the modal when clicking outside it', async () => {
      await openModal()
      fireEvent.click(screen.getByTestId('modal-backdrop'))
      expect(screen.queryByRole('heading', { name: 'Add User' })).not.toBeInTheDocument()
    })

    it('hides the modal when pressing Escape', async () => {
      const user = userEvent.setup()
      renderPage()
      await screen.findByText('Alice Admin')
      await user.click(screen.getByRole('button', { name: 'Add User' }))
      expect(screen.getByRole('heading', { name: 'Add User' })).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('heading', { name: 'Add User' })).not.toBeInTheDocument()
    })
  })
})
