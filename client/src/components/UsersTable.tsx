import { Pencil } from "lucide-react"
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
}

export default function UsersTable({ users, isPending, isError, errorMessage, onEdit }: Props) {
  const headers = (
    <tr>
      <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
      <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
      <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
      <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
      <th className="px-4 py-3" />
    </tr>
  )

  if (isPending) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">{headers}</thead>
          <tbody className="divide-y divide-gray-100">
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
      <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
        {errorMessage}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">{headers}</thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-900 font-medium">{user.name}</td>
              <td className="px-4 py-3 text-gray-600">{user.email}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    user.role === "admin"
                      ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1e3a5f] text-white"
                      : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                  }
                >
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${user.name}`}
                  onClick={() => onEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
