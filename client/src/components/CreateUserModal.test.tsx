import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import CreateUserModal from './CreateUserModal'
import { renderWithQuery } from '../test/render-with-query'

vi.mock('axios')

const onClose = vi.fn()

function renderModal(open = true) {
  return renderWithQuery(<CreateUserModal open={open} onClose={onClose} />)
}

describe('CreateUserModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
  })

  // ── rendering ────────────────────────────────────────────────────────────

  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByRole('heading', { name: 'Add User' })).not.toBeInTheDocument()
  })

  it('renders all form fields when open', () => {
    renderModal()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
  })

  it('defaults role to Agent', () => {
    renderModal()
    expect((screen.getByLabelText('Role') as HTMLSelectElement).value).toBe('agent')
  })

  // ── validation ───────────────────────────────────────────────────────────

  it('shows required errors for all fields on empty submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Email must be at least 3 characters')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('marks errored fields as aria-invalid', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    await screen.findByText('Name is required')

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows error when email is too short', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Email'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(await screen.findByText('Email must be at least 3 characters')).toBeInTheDocument()
  })

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Email'), 'notanemail')
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(await screen.findByText('Invalid email')).toBeInTheDocument()
  })

  it('shows error when password is shorter than 8 characters', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  // ── successful submission ────────────────────────────────────────────────

  it('posts correct data on valid submit', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        '/api/auth/admin/users',
        { name: 'Jane Doe', email: 'jane@example.com', password: 'securepassword', role: 'agent' },
        { withCredentials: true }
      )
    )
  })

  it('posts with admin role when selected', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Admin User')
    await user.type(screen.getByLabelText('Email'), 'admin@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.selectOptions(screen.getByLabelText('Role'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        '/api/auth/admin/users',
        expect.objectContaining({ role: 'admin' }),
        { withCredentials: true }
      )
    )
  })

  it('calls onClose after successful submission', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  // ── server error ─────────────────────────────────────────────────────────

  it('shows server error message when the request fails', async () => {
    const user = userEvent.setup()
    vi.mocked(axios.post).mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { data: { error: 'A user with this email already exists' } },
      })
    )
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('A user with this email already exists')).toBeInTheDocument()
  })

  it('does not call onClose when the request fails', async () => {
    const user = userEvent.setup()
    vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))
    vi.mocked(axios.isAxiosError).mockReturnValue(false)

    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await screen.findByText('Network error')
    expect(onClose).not.toHaveBeenCalled()
  })

  // ── pending state ────────────────────────────────────────────────────────

  it('disables the submit button and shows "Creating…" while pending', async () => {
    vi.mocked(axios.post).mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByLabelText('Name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'securepassword')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    )
  })

  // ── cancel ───────────────────────────────────────────────────────────────

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
