import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectMongoose } from '@/lib/mongoose'
import Team from '@/models/team'
import Participant from '@/models/participant'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectMongoose()
  const email = session.user.email
  const team = await Team.findOne({ memberUserIds: email }).lean()
  if (!team) return NextResponse.json({ team: null })
  const members = await Participant.find({ email: { $in: team.memberUserIds } }, { name:1, gender:1, email:1, _id:0 }).lean()
  return NextResponse.json({ team, members })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectMongoose()
  const email = session.user.email
  const team = await Team.findOne({ leaderUserId: email })
  if (!team) return NextResponse.json({ error: 'Not leader or no team' }, { status: 403 })
  await Team.deleteOne({ _id: team._id })
  return NextResponse.json({ ok: true, forfeited: true })
}
