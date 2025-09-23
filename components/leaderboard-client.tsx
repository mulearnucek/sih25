"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Star } from "lucide-react"

interface LeaderboardEntry {
  _id: string
  teamName: string
  totalScore: number
  averageScore: number
  judgeCount: number
  scores: Array<{
    judgeId: string
    judgeName: string
    totalScore: number
    scores: {
      [key: string]: number // Make it flexible to handle any score structure
    }
  }>
}

export default function LeaderboardClient() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/judging/leaderboard")
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <Star className="h-6 w-6 text-slate-400" />
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-200 bg-yellow-50"
      case 2:
        return "border-gray-200 bg-gray-50"
      case 3:
        return "border-amber-200 bg-amber-50"
      default:
        return "border-slate-200 bg-white"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Scores Yet</h3>
            <p className="text-slate-500">Scores will appear here as judges submit their evaluations</p>
          </CardContent>
        </Card>
      ) : (
        leaderboard.map((entry, index) => {
          const rank = index + 1
          return (
            <Card key={entry._id} className={`border-2 ${getRankColor(rank)}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(rank)}
                      <span className="text-2xl font-bold text-slate-700">#{rank}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{entry.teamName}</h3>
                      <p className="text-slate-600">
                        Scored by {entry.judgeCount} judge{entry.judgeCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{entry.averageScore.toFixed(1)}</div>
                    <div className="text-sm text-slate-500">Total: {entry.totalScore}</div>
                  </div>
                </div>

                {/* Individual Judge Scores */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Individual Scores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {entry.scores.map((score, scoreIndex) => (
                      <div key={scoreIndex} className="bg-white rounded-lg p-3 border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-slate-700">{score.judgeName}</span>
                          <Badge variant="outline" className="text-xs">
                            {score.totalScore}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-xs">
                          {Object.entries(score.scores).slice(0, 5).map(([key, value], idx) => {
                            const colors = ['text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-red-600']
                            const labels = {
                              'novelty': 'Nov',
                              'usability': 'Use', 
                              'social-impact': 'Soc',
                              'presentation': 'Pres',
                              'feasibility': 'Feas',
                              'innovation': 'Inn',
                              'technical': 'Tech',
                              'impact': 'Imp'
                            }
                            return (
                              <div key={key} className="text-center">
                                <div className={`font-medium ${colors[idx] || 'text-slate-600'}`}>{value}</div>
                                <div className="text-slate-500">{labels[key as keyof typeof labels] || key.slice(0, 3)}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
