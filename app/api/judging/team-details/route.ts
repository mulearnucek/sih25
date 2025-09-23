import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectMongoose } from '@/lib/mongoose'
import Team from '@/models/team'
import Participant from '@/models/participant'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    await connectMongoose()

    const team = await Team.findById(teamId).lean()
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const members = await Participant.find(
      { email: { $in: team.memberUserIds || [] } }, 
      { name: 1, email: 1, gender: 1, _id: 0 }
    ).lean()

    return NextResponse.json({ team, members })
  } catch (error) {
    console.error('Error fetching team details:', error)
    return NextResponse.json({ error: 'Failed to fetch team details' }, { status: 500 })
  }
}
