import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Score from "@/models/score"
import Judge from "@/models/judge"
import Presentation from "@/models/presentation"

export async function GET() {
  try {
    const sessionRaw = await getServerSession(authOptions)
    const session = sessionRaw as { user?: { isAdmin?: boolean } }
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    await connectMongoose()

    // Get currently presenting team
    const currentPresenting = await Presentation.findOne({ status: "presenting" }).lean()
    
    if (!currentPresenting) {
      return NextResponse.json({ 
        judgeProgress: [],
        currentTeam: null,
        message: "No team is currently presenting"
      })
    }

    // Get all active judges
    const judges = await Judge.find({ isActive: true }).lean()

    // Get scores for the currently presenting team
    const currentTeamScores = await Score.find({
      teamId: currentPresenting.teamId,
      isSubmitted: true
    }).lean()

    // Create a map of judge submissions for quick lookup
    const submittedJudges = new Set(currentTeamScores.map(score => score.judgeId))

    // Build judge progress for current team
    const judgeProgress = judges.map(judge => ({
      judgeId: judge.email, // Using email as judgeId
      judgeName: judge.name,
      hasSubmitted: submittedJudges.has(judge.email),
      organization: judge.organization
    }))

    return NextResponse.json({ 
      judgeProgress,
      currentTeam: {
        teamId: currentPresenting.teamId,
        teamName: currentPresenting.teamName,
        order: currentPresenting.order
      },
      totalJudges: judges.length,
      submittedCount: currentTeamScores.length
    })
  } catch (error) {
    console.error("Error fetching judge progress:", error)
    return NextResponse.json({ error: "Failed to fetch judge progress" }, { status: 500 })
  }
}
