import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Score from "@/models/score"
import Presentation from "@/models/presentation"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    await connectMongoose()

    // Get all participating teams
    const presentations = await Presentation.find({ isParticipating: true }).lean()
    const totalTeams = presentations.length

    // Get all submitted scores grouped by judge
    const judgeScores = await Score.aggregate([
      { $match: { isSubmitted: true } },
      {
        $group: {
          _id: "$judgeId",
          judgeName: { $first: "$judgeName" },
          completedTeams: { $addToSet: "$teamId" },
          scoreCount: { $sum: 1 },
        },
      },
    ])

    const judgeProgress = judgeScores.map((judge) => ({
      judgeId: judge._id,
      judgeName: judge.judgeName,
      completedTeams: judge.completedTeams,
      totalTeams: totalTeams,
    }))

    return NextResponse.json({ judgeProgress })
  } catch (error) {
    console.error("Error fetching judge progress:", error)
    return NextResponse.json({ error: "Failed to fetch judge progress" }, { status: 500 })
  }
}
