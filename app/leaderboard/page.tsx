import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import LeaderboardClient from "@/components/leaderboard-client"

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Live Leaderboard</h1>
          <p className="text-slate-600">Real-time scoring results</p>
        </div>
        <LeaderboardClient />
      </div>
    </div>
  )
}
