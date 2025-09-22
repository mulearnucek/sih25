import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Score from "@/models/score"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoose()

    // Aggregate scores by team
    const leaderboard = await Score.aggregate([
      { $match: { isSubmitted: true } },
      {
        $group: {
          _id: "$teamId",
          teamName: { $first: "$teamName" },
          totalScore: { $sum: "$totalScore" },
          averageScore: { $avg: "$totalScore" },
          judgeCount: { $sum: 1 },
          scores: {
            $push: {
              judgeId: "$judgeId",
              judgeName: "$judgeName",
              totalScore: "$totalScore",
              scores: "$scores",
            },
          },
        },
      },
      { $sort: { averageScore: -1 } },
    ])

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
