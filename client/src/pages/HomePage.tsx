import Navbar from "../components/Navbar"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
        <p className="mt-2 text-sm text-gray-500">Dashboard coming soon.</p>
      </main>
    </div>
  )
}
