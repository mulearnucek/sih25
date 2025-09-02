import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"
import Team from "@/models/team"

export async function GET() {
  // Simple authentication removed for basic dashboard access
  // In production, you might want to add proper API authentication

  await connectMongoose()
  const participantsRaw = await Participant.find({}, { _id: 0, __v: 0 }).lean()
  const teamsRaw = await Team.find({}, { _id: 0, __v: 0 }).lean()

  const wb = XLSX.utils.book_new()
  
  // Create a map of userId to team info
  const userTeamMap = new Map()
  
  teamsRaw.forEach((team: any) => {
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
  
  // Collect all distinct dynamic field keys
  const dynamicKeys = new Set<string>()
  for (const p of participantsRaw) {
    if (p.fields && typeof p.fields === 'object') {
      for (const k of Object.keys(p.fields)) dynamicKeys.add(k)
    }
  }
  const orderedDynamicKeys = Array.from(dynamicKeys).sort()

  // Flatten participants and add team status
  const participants = participantsRaw.map(p => {
    const base: any = { ...p }
    delete base.fields
    
    // Add dynamic fields
    for (const k of orderedDynamicKeys) {
      base[k] = p.fields?.[k] ?? ''
    }
    
    // Add team status information
    const teamInfo = userTeamMap.get(p.userId) || {
      teamName: '',
      role: '',
      hasTeam: false
    }
    
    base.teamName = teamInfo.teamName || 'No Team'
    base.teamRole = teamInfo.role || 'No Role'
    base.hasTeam = teamInfo.hasTeam ? 'Yes' : 'No'
    
    return base
  })

  const pSheet = XLSX.utils.json_to_sheet(participants)

  // Flatten team arrays for better spreadsheet readability
  const teams = teamsRaw.map((t:any) => ({
    ...t,
    memberCount: Array.isArray(t.memberUserIds) ? t.memberUserIds.length : 0,
    memberUserIds: Array.isArray(t.memberUserIds) ? t.memberUserIds.join(', ') : ''
  }))
  const tSheet = XLSX.utils.json_to_sheet(teams)

  XLSX.utils.book_append_sheet(wb, pSheet, "Participants")
  XLSX.utils.book_append_sheet(wb, tSheet, "Teams")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sih-internals-export.xlsx"',
    },
  })
}
