import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectMongoose } from '@/lib/mongoose'
import Team from '@/models/team'

// POST: remove current user from a team they are member of (not leader)
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectMongoose()
  const email = session.user.email
  const team = await Team.findOne({ memberUserIds: email })
  if (!team) return NextResponse.json({ error: 'Not in a team' }, { status: 400 })
  if (team.leaderUserId === email) return NextResponse.json({ error: 'Leader cannot leave; delete team instead' }, { status: 400 })
  team.memberUserIds = team.memberUserIds.filter((m: string) => m !== email)
  await team.save()
  return NextResponse.json({ ok: true, left: true })
}
