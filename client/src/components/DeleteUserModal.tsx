import { useEffect, useState } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  open: boolean
  user: User | null
  onClose: () => void
}

export default function DeleteUserModal({ open, user, onClose }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      axios.delete(`/api/auth/admin/users/${user!.id}`, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setServerError(null)
      onClose()
    },
    onError: (err) => {
      setServerError(
        axios.isAxiosError(err)
          ? (err.response?.data?.error ?? err.message)
          : err instanceof Error ? err.message : String(err)
      )
    },
  })

  function handleClose() {
    setServerError(null)
    mutation.reset()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  if (!open || !user) return null

  return (
    <div
      data-testid="delete-modal-backdrop"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-card rounded-lg border border-border w-full max-w-sm mx-4 p-6">
        <h3 className="font-display italic text-lg text-ink mb-2">Delete User</h3>
        <p className="text-sm text-ink-muted mb-1">
          Are you sure you want to delete <span className="font-medium text-ink">{user.name}</span>?
        </p>
        <p className="text-sm text-ink-muted mb-5">{user.email}</p>

        {serverError && (
          <p className="text-sm text-maroon bg-maroon-tint px-3 py-2 rounded-md mb-4">{serverError}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}
