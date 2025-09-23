import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Timer from "@/models/timer"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoose()

    // Get the timer state from database, create one if it doesn't exist
    let timer = await Timer.findOne().lean()
    
    if (!timer) {
      timer = await Timer.create({
        currentTime: 600,
        isActive: false,
        currentTeam: null,
        lastUpdate: new Date(),
      })
    }

    const timerSync = {
      currentTime: timer.currentTime,
      isActive: timer.isActive,
      currentTeam: timer.currentTeam,
    }

    return NextResponse.json({ timerSync })
  } catch (error) {
    console.error("Error fetching timer sync:", error)
    return NextResponse.json({ error: "Failed to fetch timer sync" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionRaw = await getServerSession(authOptions)
    const session = sessionRaw as { user?: { isAdmin?: boolean } }
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const { currentTime, isActive, currentTeam } = body

    await connectMongoose()

    // Find existing timer or create new one
    let timer = await Timer.findOne()
    
    if (!timer) {
      timer = new Timer({
        currentTime: currentTime ?? 600,
        isActive: isActive ?? false,
        currentTeam: currentTeam ?? null,
        lastUpdate: new Date(),
      })
    } else {
      // Update existing timer
      if (currentTime !== undefined) timer.currentTime = currentTime
      if (isActive !== undefined) timer.isActive = isActive
      if (currentTeam !== undefined) timer.currentTeam = currentTeam
      timer.lastUpdate = new Date()
    }

    await timer.save()

    const timerSync = {
      currentTime: timer.currentTime,
      isActive: timer.isActive,
      currentTeam: timer.currentTeam,
    }

    return NextResponse.json({ success: true, timerSync })
  } catch (error) {
    console.error("Error updating timer sync:", error)
    return NextResponse.json({ error: "Failed to update timer sync" }, { status: 500 })
  }
}
