import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Score from "@/models/score"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const judgeId = searchParams.get("judgeId")

    const query: any = {}
    if (teamId) query.teamId = teamId
    if (judgeId) query.judgeId = judgeId

    const scores = await Score.find(query).lean()
    return NextResponse.json({ scores })
  } catch (error) {
    console.error("Error fetching scores:", error)
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized - Judge access required" }, { status: 401 })
    }

    const body = await request.json()
    const { teamId, teamName, scores, comments } = body

    if (!teamId || !teamName || !scores) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await connectMongoose()

    // Calculate total score
    const totalScore = Object.values(scores).reduce((sum: number, score: any) => sum + (score || 0), 0)

    // Upsert score (update if exists, create if not)
    const scoreDoc = await Score.findOneAndUpdate(
      { teamId, judgeId: session.user.email },
      {
        teamId,
        teamName,
        judgeId: session.user.email,
        judgeName: session.user.name,
        scores,
        totalScore,
        comments: comments || "",
        isSubmitted: true,
      },
      { upsert: true, new: true, strict: false },
    )

    return NextResponse.json({ success: true, score: scoreDoc })
  } catch (error) {
    console.error("Error saving score:", error)
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 })
  }
}
