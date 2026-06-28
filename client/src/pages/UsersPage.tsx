import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import Navbar from "../components/Navbar"

interface User {
  id: string
  name: string
  email: string
  role: string
  email_verified: boolean
  created_at: string
}

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<User[]>("/api/users", { withCredentials: true })
  return res.data
}

export default function UsersPage() {
  const { data: users = [], isPending, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Users</h2>

        {isPending && (
          <p className="text-sm text-gray-400">Loading…</p>
        )}

        {isError && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-md">
            {axios.isAxiosError(error)
              ? (error.response?.data?.detail ?? error.message)
              : String(error)}
          </p>
        )}

        {!isPending && !isError && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Joined</th>
                </tr>
              </thead>
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
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
