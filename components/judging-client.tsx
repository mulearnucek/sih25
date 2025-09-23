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
import { Trophy, Clock, Users, Star, Send, Eye, Edit2, CheckCircle } from "lucide-react"
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
  const [syncedTimer, setSyncedTimer] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [realTimeTimer, setRealTimeTimer] = useState<number | null>(null)
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([])
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
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

  const presentations = presentationsData?.presentations || []
  const myScores = scoresData?.scores || []
  const judgeProgress = judgeProgressData?.judgeProgress || []

  useEffect(() => {
    if (timerSyncData?.timerSync) {
      const sync: TimerSync = timerSyncData.timerSync
      setSyncedTimer(sync.currentTime)
      setTimerActive(sync.isActive)
    }
  }, [timerSyncData])

  useEffect(() => {
    const presenting = presentations.find((p: Presentation) => p.status === "presenting")
    setCurrentPresenting(presenting || null)
    
    // Fetch team details when a team is presenting
    if (presenting?.teamId) {
      fetchTeamDetails(presenting.teamId)
    } else {
      setTeamDetails(null)
    }
  }, [presentations])

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const displayTimer = realTimeTimer !== null ? realTimeTimer : syncedTimer

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const maxTotalScore = rubrics.reduce((sum, criterion) => sum + criterion.maxScore, 0)
  const hasScored = myScores.some((score: any) => score.teamId === currentPresenting?.teamId)

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Content - Split Layout */}
      <div className="flex h-full">
        {/* Left Side - Team Details and Timer */}
        <div className="w-1/2 p-6 border-r bg-white">
          <div className="h-full flex flex-col space-y-6">
            
            {/* Timer and Current Team - Combined */}
            <Card className="shadow-lg">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6" />
                  Current Presentation
                </CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                {/* Timer */}
                {displayTimer !== null && (
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-3 bg-blue-50 p-4 rounded-lg">
                      <Clock className="h-6 w-6 text-blue-600" />
                      <div className="text-center">
                        <div className={`font-mono font-bold text-3xl ${displayTimer <= 60 ? "text-red-600" : "text-blue-600"}`}>
                          {formatTime(displayTimer)}
                        </div>
                        {displayTimer === 0 && (
                          <div className="text-red-600 font-bold text-sm mt-1 animate-pulse">TIME'S UP!</div>
                        )}
                        {displayTimer <= 60 && displayTimer > 0 && (
                          <div className="text-red-600 font-semibold text-xs mt-1">Final Minute!</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentPresenting ? (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center items-center gap-4">
                      <span className="text-xl font-bold text-blue-600">#{currentPresenting.order}</span>
                      <h2 className="text-2xl font-bold text-slate-900">{currentPresenting.teamName}</h2>
                    </div>
                    
                    {/* Team Leader */}
                    {teamDetails?.team?.leaderUserId && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-600 mb-1">Team Leader</p>
                        <div className="text-sm font-medium text-slate-700 bg-slate-50 py-2 px-3 rounded">
                          {teamDetails.members.find(member => member.email === teamDetails.team.leaderUserId)?.name || teamDetails.team.leaderUserId}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No team is currently presenting</h3>
                    <p className="text-sm">Please wait for the next presentation to begin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last Two Scoring Criteria on Left Side */}
            {currentPresenting && rubrics.slice(-2).map((criterion) => (
              <Card key={criterion.key} className="shadow-lg">
                <CardContent className="py-4">
                  <div className="space-y-3 p-4 bg-white rounded-lg border">
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Side - Scoring Form */}
        <div className="w-1/2 p-6 bg-gray-50 overflow-y-auto">
          {currentPresenting ? (
            <Card className="shadow-lg h-full">
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
                {rubrics.slice(0, 3).map((criterion) => (
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

                {/* Total Score Display - Made Smaller */}
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

                {/* Submit Button */}
                <Button 
                  onClick={submitScore} 
                  disabled={submitting} 
                  className="w-full text-lg py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
                  size="lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {submitting ? "Submitting..." : hasScored ? "Update Score" : "Submit Score"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Active Presentation</h3>
                <p className="text-sm">Scoring will be available when a team is presenting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for View All Teams */}
      <Dialog open={showAllTeamsModal} onOpenChange={setShowAllTeamsModal}>
        <DialogTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50"
            size="lg"
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
  )
}
