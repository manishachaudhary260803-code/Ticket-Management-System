import { useNavigate } from "react-router-dom"
import { authClient } from "../lib/auth-client"

export default function Navbar() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    navigate("/login")
  }

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <span className="font-semibold text-gray-800">Ticket Management</span>

      <div className="flex items-center gap-4">
        {session?.user?.name && (
          <span className="text-sm text-gray-600">
            {session.user.name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
