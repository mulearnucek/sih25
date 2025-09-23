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
    const sessionRaw = await getServerSession(authOptions)
    const session = sessionRaw as { user?: { isAdmin?: boolean } }
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const { action, teamId, order } = body

    await connectMongoose()

    if (action === "setup") {
      // Setup presentations from teams with exactly 6 members
      const teams = await Team.find({}).lean()

      // Filter teams to only include those with exactly 6 members
      const completeTeams = teams.filter(team => {
        const totalMembers = team.memberUserIds ? team.memberUserIds.length : 0;
        return totalMembers === 6;
      });

      // Clear existing presentations
      await Presentation.deleteMany({})

      // Create presentations only for complete teams (6 members)
      const presentations = completeTeams.map((team, index) => ({
        teamId: team._id.toString(),
        teamName: team.name,
        order: index + 1,
        status: "waiting",
        isParticipating: true,
      }))

      await Presentation.insertMany(presentations)

      return NextResponse.json({ 
        success: true, 
        message: `Presentations setup complete for ${completeTeams.length} complete teams (6 members each)`,
        totalTeams: teams.length,
        completeTeams: completeTeams.length
      })
    }

    if (action === "resetAll") {
      // Reset all presentations to waiting status and clear timestamps
      await Presentation.updateMany(
        {},
        {
          $set: { status: "waiting" },
          $unset: { startTime: "", endTime: "" },
        },
      )

      return NextResponse.json({ success: true, message: "All presentation states reset" })
    }

    if (action === "updateOrder" && teamId && order !== undefined) {
      const currentPresentation = await Presentation.findOne({ teamId })
      if (!currentPresentation) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 })
      }

      const oldOrder = currentPresentation.order
      const newOrder = order

      if (oldOrder !== newOrder) {
        // Reorder other presentations
        if (newOrder > oldOrder) {
          // Moving down: shift presentations up
          await Presentation.updateMany(
            { order: { $gt: oldOrder, $lte: newOrder }, teamId: { $ne: teamId } },
            { $inc: { order: -1 } },
          )
        } else {
          // Moving up: shift presentations down
          await Presentation.updateMany(
            { order: { $gte: newOrder, $lt: oldOrder }, teamId: { $ne: teamId } },
            { $inc: { order: 1 } },
          )
        }

        // Update the target presentation
        await Presentation.findOneAndUpdate({ teamId }, { order: newOrder })
      }

      return NextResponse.json({ success: true })
    }

    if (action === "removeTeam" && teamId) {
      const presentation = await Presentation.findOne({ teamId })
      if (!presentation) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 })
      }

      const removedOrder = presentation.order

      // Remove the presentation
      await Presentation.deleteOne({ teamId })

      // Reorder remaining presentations
      await Presentation.updateMany({ order: { $gt: removedOrder } }, { $inc: { order: -1 } })

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
