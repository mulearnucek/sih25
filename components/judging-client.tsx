"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trophy, Clock, Users, Star, Send, Eye, Edit2, CheckCircle, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import useSWR from "swr"

interface Presentation {
  _id: string
  teamId: string
  teamName: string
  order: number
  status: "waiting" | "presenting" | "completed" | "skipped"
  startTime?: string
  endTime?: string
  timerDuration: number
  isParticipating: boolean
}

interface TeamMember {
  name: string
  email: string
  gender: string
}

interface TeamDetails {
  team: any
  members: TeamMember[]
}

interface Score {
  [key: string]: number
}

interface RubricCriterion {
  key: string
  label: string
  description: string
  maxScore: number
  weight: number
}

interface TimerSync {
  currentTime: number
  isActive: boolean
  currentTeam: string | null
}

interface JudgeCompletion {
  judgeId: string
  judgeName: string
  completedTeams: string[]
  totalTeams: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function JudgingClient() {
  const { data: session } = useSession()
  const [currentPresenting, setCurrentPresenting] = useState<Presentation | null>(null)
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null)
  const [scores, setScores] = useState<Score>({})
  const [submitting, setSubmitting] = useState(false)
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [syncedTimer, setSyncedTimer] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [realTimeTimer, setRealTimeTimer] = useState<number | null>(null)
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([])
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const { toast } = useToast()

  // Real-time timer update
  useEffect(() => {
    if (syncedTimer !== null && timerActive) {
      setRealTimeTimer(syncedTimer)
      const interval = setInterval(() => {
        setRealTimeTimer(prev => {
          if (prev === null || prev <= 0) return 0
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setRealTimeTimer(syncedTimer)
    }
  }, [syncedTimer, timerActive])

  useEffect(() => {
    const loadRubrics = async () => {
      // Fallback to default rubrics
      const defaultRubrics = [
        {
          key: "novelty",
          label: "Novelty",
          description: "Uniqueness and innovation of the solution",
          maxScore: 100,
          weight: 1.0,
        },
        {
          key: "usability",
          label: "Usability",
          description: "",
          maxScore: 100,
          weight: 1.0,
        },
        {
          key: "social-impact",
          label: "Market potential or Social worth of the solution",
          description: "",
          maxScore: 100,
          weight: 1.0,
        },
        {
          key: "presentation",
          label: "Presentation Quality",
          description: "Clarity, communication, and demo effectiveness",
          maxScore: 100,
          weight: 1.0,
        },
        {
          key: "feasibility",
          label: "Feasibility & Scalability",
          description: "Practicality and potential for real-world implementation",
          maxScore: 100,
          weight: 1.0,
        },
      ]
      setRubrics(defaultRubrics)
      const initialScores: Score = {}
      const initialInputs: { [key: string]: string } = {}
      defaultRubrics.forEach((criterion) => {
        initialScores[criterion.key] = 5
        initialInputs[criterion.key] = "5"
      })
      setScores(initialScores)
      setInputValues(initialInputs)
    }
    loadRubrics()
  }, [])

  const {
    data: presentationsData,
    error: presentationsError,
    mutate: mutatePresentations,
  } = useSWR(
    "/api/judging/presentations",
    fetcher,
    { refreshInterval: 3000 }, // Faster refresh for better sync
  )

  const {
    data: scoresData,
    error: scoresError,
    mutate: mutateScores,
  } = useSWR(session?.user?.email ? `/api/judging/scores?judgeId=${session.user.email}` : null, fetcher, {
    refreshInterval: 5000,
  })

  const { data: timerSyncData } = useSWR(
    "/api/judging/timer-sync",
    fetcher,
    { refreshInterval: 1000 }, // Real-time timer sync
  )

  const { data: judgeProgressData } = useSWR("/api/judging/judge-progress", fetcher, {
    refreshInterval: 5000,
  })

  const { data: leaderboardData } = useSWR("/api/judging/leaderboard", fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
  })

  const presentations = presentationsData?.presentations || []
  const myScores = scoresData?.scores || []
  const judgeProgress = judgeProgressData?.judgeProgress || []
  const leaderboard = leaderboardData?.leaderboard || []

  useEffect(() => {
    if (timerSyncData?.timerSync) {
      const sync: TimerSync = timerSyncData.timerSync
      setSyncedTimer(sync.currentTime)
      setTimerActive(sync.isActive)
    }
  }, [timerSyncData])

  useEffect(() => {
    const presenting = presentations.find((p: Presentation) => p.status === "presenting")
    const previousTeamId = currentPresenting?.teamId
    setCurrentPresenting(presenting || null)
    
    // Reset form when team changes
    if (presenting?.teamId !== previousTeamId) {
      setIsEditMode(false)
      
      // Reset scores and inputs to default values
      const initialScores: Score = {}
      const initialInputs: { [key: string]: string } = {}
      rubrics.forEach((criterion) => {
        initialScores[criterion.key] = 5
        initialInputs[criterion.key] = "5"
      })
      setScores(initialScores)
      setInputValues(initialInputs)
    }
    
    // Fetch team details when a team is presenting
    if (presenting?.teamId) {
      fetchTeamDetails(presenting.teamId)
    } else {
      setTeamDetails(null)
    }
  }, [presentations, currentPresenting?.teamId, rubrics])

  const fetchTeamDetails = async (teamId: string) => {
    try {
      const response = await fetch(`/api/judging/team-details?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setTeamDetails(data)
      }
    } catch (error) {
      console.error('Error fetching team details:', error)
    }
  }

  const handleScoreChange = (criterion: string, value: number[]) => {
    const newValue = value[0]
    setScores((prev) => ({
      ...prev,
      [criterion]: newValue,
    }))
    setInputValues((prev) => ({
      ...prev,
      [criterion]: newValue.toString(),
    }))
  }

  const handleInputChange = (criterion: string, value: string) => {
    const numValue = Number.parseInt(value) || 0
    const maxScore = rubrics.find((r) => r.key === criterion)?.maxScore || 100
    const clampedValue = Math.max(0, Math.min(numValue, maxScore))

    setInputValues((prev) => ({
      ...prev,
      [criterion]: value,
    }))

    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxScore) {
      setScores((prev) => ({
        ...prev,
        [criterion]: clampedValue,
      }))
    }
  }

  const submitScore = async () => {
    if (!currentPresenting) {
      toast({
        title: "No Team Presenting",
        description: "Please wait for a team to start presenting",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/judging/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentPresenting.teamId,
          teamName: currentPresenting.teamName,
          scores,
          comments: "", // Removed comments field
        }),
      })

      if (response.ok) {
        toast({
          title: "Score Submitted",
          description: `Score for ${currentPresenting.teamName} has been saved`,
        })
        mutateScores() // Refresh scores data
        setIsEditMode(false) // Exit edit mode after successful submission
      } else {
        throw new Error("Failed to submit score")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit score",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const enterEditMode = () => {
    // Load existing scores when entering edit mode
    if (currentPresenting && hasScored) {
      const existingScore = myScores.find((score: any) => score.teamId === currentPresenting.teamId)
      if (existingScore && existingScore.scores) {
        const loadedScores: Score = {}
        const loadedInputs: { [key: string]: string } = {}
        
        // Map the existing scores to the current rubrics
        rubrics.forEach((criterion) => {
          // Handle both old and new score structures
          const scoreValue = existingScore.scores[criterion.key] || existingScore[criterion.key] || 0
          loadedScores[criterion.key] = scoreValue
          loadedInputs[criterion.key] = scoreValue.toString()
        })
        
        setScores(loadedScores)
        setInputValues(loadedInputs)
      }
    }
    setIsEditMode(true)
  }

  const cancelEdit = () => {
    // Reset to initial scores when canceling edit
    const initialScores: Score = {}
    const initialInputs: { [key: string]: string } = {}
    rubrics.forEach((criterion) => {
      initialScores[criterion.key] = 5
      initialInputs[criterion.key] = "5"
    })
    setScores(initialScores)
    setInputValues(initialInputs)
    setIsEditMode(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const displayTimer = realTimeTimer !== null ? realTimeTimer : syncedTimer

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const maxTotalScore = rubrics.reduce((sum, criterion) => sum + criterion.maxScore, 0)
  const hasScored = myScores.some((score: any) => score.teamId === currentPresenting?.teamId)
  
  // Get the submitted score for display in success state
  const submittedScore = currentPresenting ? myScores.find((score: any) => score.teamId === currentPresenting.teamId) : null
  const submittedTotalScore = submittedScore?.totalScore || totalScore

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {currentPresenting ? (
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Compact Header - Team Info and Timer */}
          <Card className="shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                {/* Team Info */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-blue-600">#{currentPresenting.order}</span>
                        <h1 className="text-xl font-bold text-slate-900">{currentPresenting.teamName}</h1>
                      </div>
                      {teamDetails?.team?.leaderUserId && (
                        <p className="text-sm text-slate-600">
                          Leader: {teamDetails.members.find(member => member.email === teamDetails.team.leaderUserId)?.name || teamDetails.team.leaderUserId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timer */}
                {displayTimer !== null && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div className="text-center">
                      <div className={`font-mono font-bold text-2xl ${displayTimer <= 60 ? "text-red-600" : "text-blue-600"}`}>
                        {formatTime(displayTimer)}
                      </div>
                      {displayTimer === 0 && (
                        <div className="text-red-600 font-bold text-xs animate-pulse">TIME'S UP!</div>
                      )}
                      {displayTimer <= 60 && displayTimer > 0 && (
                        <div className="text-red-600 font-semibold text-xs">Final Minute!</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scoring Form - Split into Two Halves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Half - First Half of Criteria */}
            <Card className="shadow-lg">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-3">
                  <Star className="h-6 w-6" />
                  Score {currentPresenting.teamName}
                  {hasScored && (
                    <Badge variant="outline" className="ml-4">
                      Already Scored
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-6 space-y-6">
                {/* Show success state if scored and not in edit mode */}
                {hasScored && !isEditMode ? (
                  <div className="text-center py-8 space-y-6">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-green-800 mb-2">Score Submitted Successfully!</h3>
                      <p className="text-slate-600">Your evaluation for {currentPresenting.teamName} has been saved.</p>
                    </div>
                    
                    {/* Show submitted score summary */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">Your Submitted Score</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {submittedTotalScore} / {maxTotalScore}
                      </div>
                    </div>

                    {/* Edit Score Button */}
                    <Button 
                      onClick={enterEditMode}
                      variant="outline"
                      className="w-full text-lg py-4 border-green-300 text-green-700 hover:bg-green-50" 
                      size="lg"
                    >
                      <Edit2 className="h-5 w-5 mr-2" />
                      Edit Score
                    </Button>
                  </div>
                ) : (
                  // Show scoring form (either first time or in edit mode)
                  <>
                    {isEditMode && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Edit2 className="h-4 w-4" />
                          <span className="font-semibold">Editing Mode</span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          You are updating your previously submitted score.
                        </p>
                      </div>
                    )}
                    
                    {/* First half of criteria */}
                    {rubrics.slice(0, Math.ceil(rubrics.length / 2)).map((criterion) => (
                      <div key={criterion.key} className="space-y-3 p-4 bg-white rounded-lg border">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">{criterion.label}</h3>
                            {criterion.description && (
                              <p className="text-sm text-slate-600">{criterion.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              value={inputValues[criterion.key] || "0"}
                              onChange={(e) => handleInputChange(criterion.key, e.target.value)}
                              min={0}
                              max={criterion.maxScore}
                              className="w-20 text-center font-semibold"
                            />
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">{scores[criterion.key] || 0}</div>
                              <div className="text-sm text-slate-500">/{criterion.maxScore}</div>
                            </div>
                          </div>
                        </div>
                        <Slider
                          value={[scores[criterion.key] || 0]}
                          onValueChange={(value) => handleScoreChange(criterion.key, value)}
                          max={criterion.maxScore}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-2">
                          <span>0 - Poor</span>
                          <span>{Math.floor(criterion.maxScore / 2)} - Average</span>
                          <span>{criterion.maxScore} - Excellent</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Right Half - Second Half of Criteria + Total Score + Submit */}
            <Card className="shadow-lg">
              <CardContent className="py-6 space-y-6">
                {!hasScored || isEditMode ? (
                  <>
                    {/* Second half of criteria */}
                    {rubrics.slice(Math.ceil(rubrics.length / 2)).map((criterion) => (
                      <div key={criterion.key} className="space-y-3 p-4 bg-white rounded-lg border">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">{criterion.label}</h3>
                            {criterion.description && (
                              <p className="text-sm text-slate-600">{criterion.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              value={inputValues[criterion.key] || "0"}
                              onChange={(e) => handleInputChange(criterion.key, e.target.value)}
                              min={0}
                              max={criterion.maxScore}
                              className="w-20 text-center font-semibold"
                            />
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">{scores[criterion.key] || 0}</div>
                              <div className="text-sm text-slate-500">/{criterion.maxScore}</div>
                            </div>
                          </div>
                        </div>
                        <Slider
                          value={[scores[criterion.key] || 0]}
                          onValueChange={(value) => handleScoreChange(criterion.key, value)}
                          max={criterion.maxScore}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 px-2">
                          <span>0 - Poor</span>
                          <span>{Math.floor(criterion.maxScore / 2)} - Average</span>
                          <span>{criterion.maxScore} - Excellent</span>
                        </div>
                      </div>
                    ))}

                    <Separator className="my-6" />

                    {/* Total Score Display */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg text-center">
                      <h3 className="text-base font-semibold text-slate-900 mb-2">Total Score</h3>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {totalScore}
                        <span className="text-lg text-slate-500 ml-2">/ {maxTotalScore}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {Math.round((totalScore / maxTotalScore) * 100)}% of maximum score
                      </div>
                    </div>

                    {/* Submit/Update Button */}
                    <div className="flex gap-3">
                      {isEditMode && (
                        <Button 
                          onClick={cancelEdit}
                          variant="outline"
                          className="flex-1 text-lg py-4" 
                          size="lg"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button 
                        onClick={submitScore} 
                        disabled={submitting} 
                        className="flex-1 text-lg py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
                        size="lg"
                      >
                        <Send className="h-5 w-5 mr-2" />
                        {submitting ? "Submitting..." : isEditMode ? "Update Score" : hasScored ? "Update Score" : "Submit Score"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-slate-500">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Score has been submitted</p>
                      <p className="text-xs text-slate-400 mt-1">Use the Edit button to modify</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-500">
          <div className="text-center h-full  flex flex-col items-center justify-center">
            <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Active Presentation</h3>
            <p className="text-sm">Scoring will be available when a team is presenting</p>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {/* Analytics & Leaderboard Button */}
        <Dialog open={showAnalyticsModal} onOpenChange={setShowAnalyticsModal}>
          <DialogTrigger asChild>
            <Button 
              className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              size="lg"
              title="Analytics & Leaderboard"
            >
              <BarChart3 className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <BarChart3 className="h-6 w-6" />
                Analytics & Leaderboard
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-6">
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{presentations.length}</div>
                    <div className="text-sm text-slate-600">Total Teams</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {presentations.filter((p: Presentation) => p.status === "completed").length}
                    </div>
                    <div className="text-sm text-slate-600">Completed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {myScores.length}
                    </div>
                    <div className="text-sm text-slate-600">Teams I've Scored</div>
                  </CardContent>
                </Card>
              </div>

              {/* Judge Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Judge Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {judgeProgress.map((judge: JudgeCompletion) => (
                      <div key={judge.judgeId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-semibold">{judge.judgeName}</div>
                          <div className="text-sm text-slate-600">
                            {judge.completedTeams.length} / {judge.totalTeams} teams scored
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(judge.completedTeams.length / judge.totalTeams) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold">
                            {Math.round((judge.completedTeams.length / judge.totalTeams) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Current Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.length > 0 ? (
                      leaderboard.map((team: any, index: number) => {
                        const isCurrentTeam = team.teamId === currentPresenting?.teamId
                        const rankColors = {
                          0: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white", // Gold
                          1: "bg-gradient-to-r from-gray-400 to-gray-600 text-white",    // Silver
                          2: "bg-gradient-to-r from-orange-400 to-orange-600 text-white", // Bronze
                        }
                        const rankColor = rankColors[index as keyof typeof rankColors] || "bg-slate-100"
                        
                        return (
                          <div 
                            key={team.teamId} 
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                              isCurrentTeam 
                                ? "border-blue-400 bg-blue-50 shadow-md" 
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankColor}`}>
                                #{index + 1}
                              </div>
                              <div>
                                <div className={`font-semibold ${isCurrentTeam ? "text-blue-800" : ""}`}>
                                  {team.teamName}
                                  {isCurrentTeam && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Currently Presenting
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {team.judgeCount} judge{team.judgeCount !== 1 ? 's' : ''} scored
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-slate-900">
                                {team.averageScore.toFixed(1)}
                              </div>
                              <div className="text-sm text-slate-500">
                                /{team.maxPossibleScore} avg
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No scores available yet</p>
                        <p className="text-sm">Leaderboard will appear once teams are scored</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* View All Teams Button */}
        <Dialog open={showAllTeamsModal} onOpenChange={setShowAllTeamsModal}>
          <DialogTrigger asChild>
            <Button 
              className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              size="lg"
              title="View All Teams"
            >
              <Eye className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">All Teams Progress</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-6">
              {presentations.map((presentation: Presentation) => {
                const scored = myScores.some((score: any) => score.teamId === presentation.teamId)
                const statusColor = {
                  waiting: "bg-gray-100 text-gray-800",
                  presenting: "bg-blue-100 text-blue-800",
                  completed: "bg-green-100 text-green-800",
                  skipped: "bg-red-100 text-red-800",
                }[presentation.status]

                return (
                  <div key={presentation._id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-mono font-bold w-12 text-center">#{presentation.order}</span>
                      <div>
                        <h4 className="text-lg font-semibold">{presentation.teamName}</h4>
                        {scored && (
                          <Badge variant="outline" className="text-sm mt-1">
                            ✓ Scored
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusColor} text-sm py-1 px-3`}>
                      {presentation.status.charAt(0).toUpperCase() + presentation.status.slice(1)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
