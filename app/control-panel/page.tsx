import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ControlPanelClient from "@/components/control-panel-client"

export default async function ControlPanelPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.isAdmin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Judging Control Panel</h1>
          <p className="text-slate-600">Manage team presentations, timers, and judging flow</p>
        </div>
        <ControlPanelClient />
      </div>
    </div>
  )
}
