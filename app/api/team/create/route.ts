import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { generateInviteCode } from "@/lib/team"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { name } = body as { name: string }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Team name required" }, { status: 400 })
  }

  const db = await getDb()
  const userId = session.user.email

  const existingTeam = await db.collection("teams").findOne({ memberUserIds: userId })
  if (existingTeam) {
    return NextResponse.json({ error: "You are already in a team" }, { status: 400 })
  }

  const participant = await db.collection("participants").findOne({ email: userId })
  if (!participant) {
    return NextResponse.json({ error: "Complete registration first" }, { status: 400 })
  }

  const inviteCode = generateInviteCode()
  try {
    await db.collection("teams").insertOne({
      name,
      inviteCode,
      leaderUserId: userId,
      memberUserIds: [userId],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return NextResponse.json({ ok: true, inviteCode })
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json({ error: "Team name already taken" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 })
  }
}
