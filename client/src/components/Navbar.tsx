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
    <nav className="h-14 bg-navy flex items-center justify-between px-6">
      <Link to="/" className="flex items-center gap-2 font-display italic text-lg text-[#F5F4F1] hover:text-brass-tint transition-colors">
        <span className="w-1.5 h-1.5 rounded-full bg-brass" aria-hidden="true" />
        Ticket Management
      </Link>

      <div className="flex items-center gap-5">
        {session && (
          <Link to="/tickets" className="text-sm text-[#F5F4F1]/70 hover:text-brass-tint transition-colors">
            Tickets
          </Link>
        )}
        {session?.user?.role === "admin" && (
          <Link to="/users" className="text-sm text-[#F5F4F1]/70 hover:text-brass-tint transition-colors">
            Users
          </Link>
        )}
        {session?.user?.name && (
          <span className="text-sm text-[#F5F4F1]">
            {session.user.name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-[#F5F4F1]/70 hover:text-brass-tint transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
