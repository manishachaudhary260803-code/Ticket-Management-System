import { useState, useEffect } from "react"
import axios from "axios"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, type CreateUserInput, type CreateUserOutput } from "@ticket/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateUserModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput, unknown, CreateUserOutput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "agent" },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateUserOutput) =>
      axios.post("/api/auth/admin/users", data, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setServerError(null)
      reset()
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
    reset()
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

  if (!open) return null

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-card rounded-lg border border-border w-full max-w-md mx-4 p-6">
        <h3 className="font-display italic text-lg text-ink mb-5">Add User</h3>
        <form noValidate onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Full name"
              aria-invalid={!!errors.name}
              className={errors.name ? "border-maroon focus-visible:ring-maroon/20" : ""}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-maroon">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              autoComplete="off"
              aria-invalid={!!errors.email}
              className={errors.email ? "border-maroon focus-visible:ring-maroon/20" : ""}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-maroon">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className={errors.password ? "border-maroon focus-visible:ring-maroon/20" : ""}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-maroon">{errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy/40"
              {...register("role")}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {serverError && (
            <p className="text-sm text-maroon bg-maroon-tint px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create User"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
