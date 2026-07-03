import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import { authClient } from "@/lib/auth-client"
import LoginPage from "./pages/LoginPage"
import HomePage from "./pages/HomePage"
import TicketsPage from "./pages/TicketsPage"
import TicketDetailPage from "./pages/TicketDetailPage"
import UsersPage from "./pages/UsersPage"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-sm text-ink-muted">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-sm text-ink-muted">Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.user.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tickets",
    element: (
      <ProtectedRoute>
        <TicketsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/tickets/:id",
    element: (
      <ProtectedRoute>
        <TicketDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <AdminRoute>
        <UsersPage />
      </AdminRoute>
    ),
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
