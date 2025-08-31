import { type NextRequest, NextResponse } from "next/server"
import { auth, authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Team from "@/models/team"
import Participant from "@/models/participant"
import { canJoinPreservingFemaleRequirement } from "@/lib/team"
import { getServerSession } from "next-auth"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { inviteCode } = body as { inviteCode: string }
  if (!inviteCode) return NextResponse.json({ error: "Invite code required" }, { status: 400 })

  await connectMongoose()
  const userId = session.user.email

  const participant = await Participant.findOne({ email: userId }).lean()
  if (!participant) {
    return NextResponse.json({ error: "Complete registration first" }, { status: 400 })
  }
  const gender = (participant.gender || "").toLowerCase()

  const existingTeam = await Team.findOne({ memberUserIds: userId })
  if (existingTeam) {
    return NextResponse.json({ error: "You are already in a team" }, { status: 400 })
  }

  const team = await Team.findOne({ inviteCode }).lean()
  if (!team) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })

  const members = await Participant.find({ email: { $in: team.memberUserIds || [] } }, { gender: 1, _id: 0 }).lean()
  const memberGenders = members.map((m: any) => (m.gender as string).toLowerCase())

  const canJoin = canJoinPreservingFemaleRequirement(memberGenders as any, gender as any, 6)
  if (!canJoin) {
    return NextResponse.json(
      {
        error:
          "Team joining would violate constraints. Teams must have 6 members and at least 1 female member. The last slot must be taken by a female if none in team yet.",
      },
      { status: 400 },
    )
  }

  if ((team.memberUserIds?.length || 0) >= 6) {
    return NextResponse.json({ error: "Team is full (6 members)" }, { status: 400 })
  }

  await Team.updateOne({ _id: team._id }, { $addToSet: { memberUserIds: userId }, $set: { updatedAt: new Date() } })

  return NextResponse.json({ ok: true })
}
