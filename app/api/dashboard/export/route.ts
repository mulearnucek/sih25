import { NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"
import Team from "@/models/team"
import Score from "@/models/score"
import Presentation from "@/models/presentation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const sessionRaw = await getServerSession(authOptions);
  const session = sessionRaw as { user?: { isAdmin?: boolean } };
  if (!session || !session.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoose()
  const participantsRaw = await Participant.find({}, { _id: 0, __v: 0 }).lean()
  const teamsRaw = await Team.find({}, { _id: 0, __v: 0 }).lean()
  const scoresRaw = await Score.find({}).lean()
  const presentationsRaw = await Presentation.find({}).lean()

  const wb = XLSX.utils.book_new()
  
  // Create a map of userId to team info
  const userTeamMap = new Map()
  
  teamsRaw.forEach((team: any) => {
    // Add leader to map
    if (team.leaderUserId) {
      userTeamMap.set(team.leaderUserId, {
        teamName: team.name,
        teamId: team.teamId,
        role: 'Leader',
        hasTeam: true
      })
    }
    
    // Add members to map
    if (team.memberUserIds && Array.isArray(team.memberUserIds)) {
      team.memberUserIds.forEach((userId: string) => {
        userTeamMap.set(userId, {
          teamName: team.name,
          teamId: team.teamId,
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

  // Create comprehensive scoring sheets
  
  // 1. Detailed Scores Sheet - All individual scores
  const detailedScores = scoresRaw.map((score: any) => {
    const teamInfo = teamsRaw.find((t: any) => t.teamId === score.teamId)
    const presentationInfo = presentationsRaw.find((p: any) => p.teamId === score.teamId)
    
    const flatScore: any = {
      teamId: score.teamId,
      teamName: score.teamName || teamInfo?.name || 'Unknown Team',
      presentationOrder: presentationInfo?.order || 'N/A',
      presentationStatus: presentationInfo?.status || 'N/A',
      judgeId: score.judgeId,
      judgeName: score.judgeName,
      totalScore: score.totalScore,
      isSubmitted: score.isSubmitted ? 'Yes' : 'No',
      submittedAt: (score as any).createdAt ? new Date((score as any).createdAt).toLocaleString() : 'N/A',
      comments: score.comments || ''
    }
    
    // Add individual criterion scores
    if (score.scores && typeof score.scores === 'object') {
      Object.entries(score.scores).forEach(([criterion, value]) => {
        flatScore[`score_${criterion}`] = value
      })
    }
    
    return flatScore
  })
  
  // 2. Team Summary Sheet - Aggregated scores per team
  const teamScoresSummary = teamsRaw.map((team: any) => {
    const teamScores = scoresRaw.filter((s: any) => s.teamId === team.teamId && s.isSubmitted)
    const presentationInfo = presentationsRaw.find((p: any) => p.teamId === team.teamId)
    
    const totalScores = teamScores.reduce((sum, score) => sum + (score.totalScore || 0), 0)
    const averageScore = teamScores.length > 0 ? totalScores / teamScores.length : 0
    const judgeCount = teamScores.length
    
    // Calculate average for each criterion
    const criteriaAverages: any = {}
    const criteriaData: any = {}
    
    teamScores.forEach((score: any) => {
      if (score.scores && typeof score.scores === 'object') {
        Object.entries(score.scores).forEach(([criterion, value]: [string, any]) => {
          if (!criteriaData[criterion]) {
            criteriaData[criterion] = []
          }
          criteriaData[criterion].push(value || 0)
        })
      }
    })
    
    Object.entries(criteriaData).forEach(([criterion, values]: [string, any]) => {
      const average = values.length > 0 ? values.reduce((sum: number, val: number) => sum + val, 0) / values.length : 0
      criteriaAverages[`avg_${criterion}`] = Math.round(average * 100) / 100
    })
    
    return {
      teamId: team.teamId,
      teamName: team.name,
      presentationOrder: presentationInfo?.order || 'N/A',
      presentationStatus: presentationInfo?.status || 'waiting',
      memberCount: Array.isArray(team.memberUserIds) ? team.memberUserIds.length + 1 : 1, // +1 for leader
      judgeCount,
      totalScore: totalScores,
      averageScore: Math.round(averageScore * 100) / 100,
      maxPossibleScore: judgeCount * 500, // Assuming 500 is max per judge
      completionPercentage: judgeCount > 0 ? `${Math.round((judgeCount / 5) * 100)}%` : '0%', // Assuming 5 judges total
      ...criteriaAverages
    }
  })
  
  // 3. Judge Progress Sheet
  const judgeProgress = Array.from(new Set(scoresRaw.map(s => s.judgeId))).map(judgeId => {
    const judgeScores = scoresRaw.filter(s => s.judgeId === judgeId && s.isSubmitted)
    const judgeName = judgeScores[0]?.judgeName || judgeId
    const totalTeams = teamsRaw.length
    const scoredTeams = judgeScores.length
    const completionRate = totalTeams > 0 ? Math.round((scoredTeams / totalTeams) * 100) : 0
    
    return {
      judgeId,
      judgeName,
      totalTeams,
      scoredTeams,
      remainingTeams: totalTeams - scoredTeams,
      completionRate: `${completionRate}%`,
      averageScoreGiven: scoredTeams > 0 ? 
        Math.round((judgeScores.reduce((sum, s) => sum + (s.totalScore || 0), 0) / scoredTeams) * 100) / 100 : 0,
      lastScoredAt: judgeScores.length > 0 ? 
        new Date(Math.max(...judgeScores.map((s: any) => new Date(s.updatedAt || s.createdAt || Date.now()).getTime()))).toLocaleString() : 'Never'
    }
  })
  
  // 4. Leaderboard Sheet
  const leaderboard = teamScoresSummary
    .filter(team => team.judgeCount > 0)
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((team, index) => ({
      rank: index + 1,
      ...team,
      medallion: index === 0 ? '🥇 Gold' : index === 1 ? '🥈 Silver' : index === 2 ? '🥉 Bronze' : ''
    }))
  
  if (detailedScores.length > 0) {
    const detailedSheet = XLSX.utils.json_to_sheet(detailedScores)
    XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed Scores")
  }
  
  const summarySheet = XLSX.utils.json_to_sheet(teamScoresSummary)
  XLSX.utils.book_append_sheet(wb, summarySheet, "Team Summary")
  
  const judgeSheet = XLSX.utils.json_to_sheet(judgeProgress)
  XLSX.utils.book_append_sheet(wb, judgeSheet, "Judge Progress")
  
  if (leaderboard.length > 0) {
    const leaderboardSheet = XLSX.utils.json_to_sheet(leaderboard)
    XLSX.utils.book_append_sheet(wb, leaderboardSheet, "Leaderboard")
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sih-complete-scores-export.xlsx"',
    },
  })
}
