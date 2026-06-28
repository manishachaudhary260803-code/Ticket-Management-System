import { useState, useEffect } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { editUserSchema, type EditUserInput, type EditUserOutput } from "@ticket/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  open: boolean
  user: User | null
  onClose: () => void
}

export default function EditUserModal({ open, user, onClose }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUserInput, unknown, EditUserOutput>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "agent" },
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, password: "", role: user.role as "agent" | "admin" })
    }
  }, [user, reset])

  const mutation = useMutation({
    mutationFn: (data: EditUserOutput) =>
      axios.patch(`/api/auth/admin/users/${user!.id}`, data, { withCredentials: true }),
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
      data-testid="edit-modal-backdrop"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-5">Edit User</h3>
        <form noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="Full name"
              aria-invalid={!!errors.name}
              className={errors.name ? "border-red-500 focus-visible:ring-red-500/20" : ""}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="user@example.com"
              autoComplete="off"
              aria-invalid={!!errors.email}
              className={errors.email ? "border-red-500 focus-visible:ring-red-500/20" : ""}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-password">New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className={errors.password ? "border-red-500 focus-visible:ring-red-500/20" : ""}
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              {...register("role")}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{serverError}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
