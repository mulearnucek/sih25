import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Presentation from "@/models/presentation"
import Team from "@/models/team"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoose()

    const presentations = await Presentation.find({ isParticipating: true }).sort({ order: 1 }).lean()

    return NextResponse.json({ presentations })
  } catch (error) {
    console.error("Error fetching presentations:", error)
    return NextResponse.json({ error: "Failed to fetch presentations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const { action, teamId, order } = body

    await connectMongoose()

    if (action === "setup") {
      // Setup presentations from teams
      const teams = await Team.find({}).lean()

      // Clear existing presentations
      await Presentation.deleteMany({})

      // Create presentations for all teams
      const presentations = teams.map((team, index) => ({
        teamId: team._id.toString(),
        teamName: team.name,
        order: index + 1,
        status: "waiting",
        isParticipating: true,
      }))

      await Presentation.insertMany(presentations)

      return NextResponse.json({ success: true, message: "Presentations setup complete" })
    }

    if (action === "updateOrder" && teamId && order !== undefined) {
      await Presentation.findOneAndUpdate({ teamId }, { order }, { new: true })

      return NextResponse.json({ success: true })
    }

    if (action === "updateStatus" && teamId) {
      const { status } = body
      const updateData: any = { status }

      if (status === "presenting") {
        updateData.startTime = new Date()
      } else if (status === "completed") {
        updateData.endTime = new Date()
      }

      await Presentation.findOneAndUpdate({ teamId }, updateData, { new: true })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing presentations:", error)
    return NextResponse.json({ error: "Failed to manage presentations" }, { status: 500 })
  }
}
