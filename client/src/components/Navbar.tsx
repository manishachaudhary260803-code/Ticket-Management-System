import { useNavigate, Link } from "react-router-dom"
import { authClient } from "../lib/auth-client"

export default function Navbar() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    navigate("/login")
  }

  return (
    <nav className="h-14 bg-[#1e3a5f] flex items-center justify-between px-6">
      <span className="font-semibold text-white">Ticket Management</span>

      <div className="flex items-center gap-4">
        {session?.user?.role === "admin" && (
          <Link to="/users" className="text-sm text-blue-200 hover:text-white transition-colors">
            Users
          </Link>
        )}
        {session?.user?.name && (
          <span className="text-sm text-white">
            {session.user.name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-blue-200 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
