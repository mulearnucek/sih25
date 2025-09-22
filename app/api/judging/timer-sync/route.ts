import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// In-memory timer state (in production, use Redis or database)
let timerState = {
  currentTime: 600,
  isActive: false,
  currentTeam: null,
  lastUpdate: Date.now(),
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ timerSync: timerState })
  } catch (error) {
    console.error("Error fetching timer sync:", error)
    return NextResponse.json({ error: "Failed to fetch timer sync" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const { currentTime, isActive, currentTeam } = body

    timerState = {
      currentTime: currentTime ?? timerState.currentTime,
      isActive: isActive ?? timerState.isActive,
      currentTeam: currentTeam ?? timerState.currentTeam,
      lastUpdate: Date.now(),
    }

    return NextResponse.json({ success: true, timerSync: timerState })
  } catch (error) {
    console.error("Error updating timer sync:", error)
    return NextResponse.json({ error: "Failed to update timer sync" }, { status: 500 })
  }
}
