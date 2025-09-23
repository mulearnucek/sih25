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
  const [scores, setScores] = useState<Score>({})
  const [submitting, setSubmitting] = useState(false)
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false)
  const [syncedTimer, setSyncedTimer] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [rubrics, setRubrics] = useState<RubricCriterion[]>([])
  const [allScoringComplete, setAllScoringComplete] = useState(false)
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()

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
  }, [presentations])

  useEffect(() => {
    const completedPresentations = presentations.filter((p: Presentation) => p.status === "completed")
    const scoredPresentations = myScores.filter((score: any) =>
      completedPresentations.some((p: Presentation) => p.teamId === score.teamId),
    )
    setAllScoringComplete(
      completedPresentations.length > 0 && scoredPresentations.length === completedPresentations.length,
    )
  }, [presentations, myScores])

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

  const allJudgesCompleted = currentPresenting
    ? judgeProgress.every((judge: JudgeCompletion) => judge.completedTeams.includes(currentPresenting.teamId))
    : false

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const maxTotalScore = rubrics.reduce((sum, criterion) => sum + criterion.maxScore, 0)
  const hasScored = myScores.some((score: any) => score.teamId === currentPresenting?.teamId)

  if (allScoringComplete && !currentPresenting) {
    return (
      <div className="p-4 w-full max-w-full">
        <Card className="text-center">
          <CardContent className="py-12">
            <div className="mb-6">
              <Trophy className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Scoring Complete!</h1>
              <p className="text-slate-600">You have successfully scored all completed presentations.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => window.open("/leaderboard", "_blank")} size="lg">
                <Trophy className="h-4 w-4 mr-2" />
                View Leaderboard
              </Button>
              <Button variant="outline" size="lg" onClick={() => setAllScoringComplete(false)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Scores
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Judge Scoring Interface</h1>
          <p className="text-slate-600">Welcome, {session?.user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {syncedTimer !== null && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className={`font-mono font-bold text-xl ${syncedTimer <= 60 ? "text-red-600" : "text-blue-600"}`}>
                {formatTime(syncedTimer)}
              </span>
              {syncedTimer === 0 && <span className="text-red-600 font-medium ml-2">Time's Up!</span>}
            </div>
          )}
          <Dialog open={showAllTeamsModal} onOpenChange={setShowAllTeamsModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All Progress
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>All Teams Progress</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {presentations.map((presentation: Presentation) => {
                  const scored = myScores.some((score: any) => score.teamId === presentation.teamId)
                  const statusColor = {
                    waiting: "bg-gray-100 text-gray-800",
                    presenting: "bg-blue-100 text-blue-800",
                    completed: "bg-green-100 text-green-800",
                    skipped: "bg-red-100 text-red-800",
                  }[presentation.status]

                  return (
                    <div key={presentation._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono w-8">#{presentation.order}</span>
                        <div>
                          <h4 className="font-medium">{presentation.teamName}</h4>
                          {scored && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Scored
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge className={`${statusColor}`}>{presentation.status}</Badge>
                    </div>
                  )
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Team Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Presentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPresenting ? (
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{currentPresenting.teamName}</h3>
                <p className="text-slate-600">Order: {currentPresenting.order}</p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className={`h-4 w-4 ${allJudgesCompleted ? "text-green-600" : "text-gray-400"}`} />
                  <span className={`text-sm ${allJudgesCompleted ? "text-green-600" : "text-gray-600"}`}>
                    {allJudgesCompleted ? "All judges completed scoring" : "Judges still scoring"}
                  </span>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Presenting
              </Badge>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team is currently presenting</p>
              <p className="text-sm">Please wait for the next presentation to begin</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Interface */}
      {currentPresenting && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Score {currentPresenting.teamName}
              </div>
              {hasScored && (
                <Badge variant="outline" className="ml-0 lg:ml-2">
                  Already Scored
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {rubrics.map((criterion) => (
              <div key={criterion.key} className="space-y-3">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{criterion.label}</h4>
                    <p className="text-sm text-slate-600">{criterion.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={inputValues[criterion.key] || "0"}
                      onChange={(e) => handleInputChange(criterion.key, e.target.value)}
                      min={0}
                      max={criterion.maxScore}
                      className="w-20 text-center"
                    />
                    <div className="text-right">
                      <span className="text-2xl font-bold text-blue-600">{scores[criterion.key] || 0}</span>
                      <span className="text-slate-500">/{criterion.maxScore}</span>
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
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0 - Poor</span>
                  <span>{Math.floor(criterion.maxScore / 2)} - Average</span>
                  <span>{criterion.maxScore} - Excellent</span>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2">
                <h4 className="font-medium text-slate-900">Total Score</h4>
                <span className="text-3xl font-bold text-green-600">
                  {totalScore}
                  <span className="text-slate-500">/{maxTotalScore}</span>
                </span>
              </div>
            </div>

            <Button onClick={submitScore} disabled={submitting} className="w-full" size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : hasScored ? "Update Score" : "Submit Score"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
