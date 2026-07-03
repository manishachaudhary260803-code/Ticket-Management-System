import { Pencil, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  name: string
  email: string
  role: string
  email_verified: boolean
  created_at: string
}

interface Props {
  users: User[]
  isPending: boolean
  isError: boolean
  errorMessage: string | null
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export default function UsersTable({ users, isPending, isError, errorMessage, onEdit, onDelete }: Props) {
  const headers = (
    <tr>
      <th className="px-4 py-3 text-left section-label text-ink-muted">Name</th>
      <th className="px-4 py-3 text-left section-label text-ink-muted">Email</th>
      <th className="px-4 py-3 text-left section-label text-ink-muted">Role</th>
      <th className="px-4 py-3 text-left section-label text-ink-muted">Joined</th>
      <th className="px-4 py-3" />
    </tr>
  )

  if (isPending) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">{headers}</thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-maroon bg-maroon-tint px-4 py-3 rounded-md">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary border-b border-border">{headers}</thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-paper transition-colors">
              <td className="px-4 py-3 text-ink font-medium">{user.name}</td>
              <td className="px-4 py-3 text-ink-muted">{user.email}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    user.role === "admin"
                      ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-navy text-white"
                      : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-ink-muted"
                  }
                >
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${user.name}`}
                    onClick={() => onEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {user.role !== "admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${user.name}`}
                      className="text-maroon hover:text-maroon hover:bg-maroon-tint"
                      onClick={() => onDelete(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
