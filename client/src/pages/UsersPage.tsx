import { useState } from "react"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import Navbar from "../components/Navbar"
import { Button } from "@/components/ui/button"
import UsersTable from "../components/UsersTable"
import CreateUserModal from "../components/CreateUserModal"

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
  const [showModal, setShowModal] = useState(false)

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
          <Button onClick={() => setShowModal(true)} size="sm">
            Add User
          </Button>
        </div>

        <UsersTable
          users={users}
          isPending={isPending}
          isError={isError}
          errorMessage={errorMessage}
        />
      </main>

      <CreateUserModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
