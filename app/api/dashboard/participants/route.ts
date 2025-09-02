import { NextResponse } from "next/server"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"
import Team from "@/models/team"

export async function GET() {
  // Simple authentication removed for basic dashboard access
  // In production, you might want to add proper API authentication
  
  await connectMongoose()
  
  // Get all participants
  const participants = await Participant.find({}, { _id: 0, __v: 0 }).lean()
  
  // Get all teams to check participant membership
  const teams = await Team.find({}, { leaderUserId: 1, memberUserIds: 1, name: 1 }).lean()
  
  // Create a map of userId to team info
  const userTeamMap = new Map()
  
  teams.forEach((team: any) => {
    // Add leader to map
    if (team.leaderUserId) {
      userTeamMap.set(team.leaderUserId, {
        teamName: team.name,
        role: 'Leader',
        hasTeam: true
      })
    }
    
    // Add members to map
    if (team.memberUserIds && Array.isArray(team.memberUserIds)) {
      team.memberUserIds.forEach((userId: string) => {
        userTeamMap.set(userId, {
          teamName: team.name,
          role: 'Member',
          hasTeam: true
        })
      })
    }
  })
  
  // Enhance participants with team status
  const participantsWithTeamStatus = participants.map((participant: any) => {
    const teamInfo = userTeamMap.get(participant.userId) || {
      teamName: null,
      role: null,
      hasTeam: false
    }
    
    return {
      ...participant,
      teamStatus: teamInfo
    }
  })
  
  return NextResponse.json({ 
    participants: participantsWithTeamStatus
  })
}
