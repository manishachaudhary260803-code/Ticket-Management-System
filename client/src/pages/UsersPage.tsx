import { useState } from "react"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import Navbar from "../components/Navbar"
import { Button } from "@/components/ui/button"
import UsersTable from "../components/UsersTable"
import CreateUserModal from "../components/CreateUserModal"
import EditUserModal from "../components/EditUserModal"
import DeleteUserModal from "../components/DeleteUserModal"

interface User {
  id: string
  name: string
  email: string
  role: string
  email_verified: boolean
  created_at: string
}

type Dialog =
  | { mode: "create" }
  | { mode: "edit"; user: User }
  | { mode: "delete"; user: User }

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<User[]>("/api/users", { withCredentials: true })
  return res.data
}

export default function UsersPage() {
  const [dialog, setDialog] = useState<Dialog | null>(null)

  const { data: users = [], isPending, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  const errorMessage = isError
    ? axios.isAxiosError(error)
      ? (error.response?.data?.detail ?? error.message)
      : String(error)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Users</h2>
          <Button onClick={() => setDialog({ mode: "create" })} size="sm">
            Add User
          </Button>
        </div>

        <UsersTable
          users={users}
          isPending={isPending}
          isError={isError}
          errorMessage={errorMessage}
          onEdit={(user) => setDialog({ mode: "edit", user })}
          onDelete={(user) => setDialog({ mode: "delete", user })}
        />
      </main>

      <CreateUserModal
        open={dialog?.mode === "create"}
        onClose={() => setDialog(null)}
      />
      <EditUserModal
        open={dialog?.mode === "edit"}
        user={dialog?.mode === "edit" ? dialog.user : null}
        onClose={() => setDialog(null)}
      />
      <DeleteUserModal
        open={dialog?.mode === "delete"}
        user={dialog?.mode === "delete" ? dialog.user : null}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
