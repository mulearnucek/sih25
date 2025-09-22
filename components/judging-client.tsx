"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Trophy, Clock, Users, Star, Send, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  innovation: number
  technical: number
  presentation: number
  feasibility: number
  impact: number
}

const SCORING_CRITERIA = [
  { key: "innovation", label: "Innovation & Creativity", description: "Uniqueness and originality of the solution" },
  {
    key: "technical",
    label: "Technical Implementation",
    description: "Quality of code, architecture, and technical approach",
  },
  { key: "presentation", label: "Presentation Quality", description: "Clarity, communication, and demo effectiveness" },
  {
    key: "feasibility",
    label: "Feasibility & Scalability",
    description: "Practicality and potential for real-world implementation",
  },
  {
    key: "impact",
    label: "Social Impact",
    description: "Potential positive impact on society and problem-solving effectiveness",
  },
]

export default function JudgingClient() {
  const { data: session } = useSession()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [currentPresenting, setCurrentPresenting] = useState<Presentation | null>(null)
  const [scores, setScores] = useState<Score>({
    innovation: 5,
    technical: 5,
    presentation: 5,
    feasibility: 5,
    impact: 5,
  })
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [myScores, setMyScores] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPresentations()
    fetchMyScores()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchPresentations()
        fetchMyScores()
      }, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    const presenting = presentations.find((p) => p.status === "presenting")
    setCurrentPresenting(presenting || null)
  }, [presentations])

  const fetchPresentations = async () => {
    try {
      const response = await fetch("/api/judging/presentations")
      const data = await response.json()
      setPresentations(data.presentations || [])
    } catch (error) {
      console.error("Error fetching presentations:", error)
    }
  }

  const fetchMyScores = async () => {
    try {
      const response = await fetch(`/api/judging/scores?judgeId=${session?.user?.email}`)
      const data = await response.json()
      setMyScores(data.scores || [])
    } catch (error) {
      console.error("Error fetching scores:", error)
    }
  }

  const handleScoreChange = (criterion: keyof Score, value: number[]) => {
    setScores((prev) => ({
      ...prev,
      [criterion]: value[0],
    }))
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
          comments,
        }),
      })

      if (response.ok) {
        toast({
          title: "Score Submitted",
          description: `Score for ${currentPresenting.teamName} has been saved`,
        })
        setComments("")
        fetchMyScores()
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

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const hasScored = myScores.some((score) => score.teamId === currentPresenting?.teamId)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Judge Scoring Interface</h1>
          <p className="text-slate-600">Welcome, {session?.user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              fetchPresentations()
              fetchMyScores()
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setAutoRefresh(!autoRefresh)} variant={autoRefresh ? "default" : "outline"} size="sm">
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{currentPresenting.teamName}</h3>
                <p className="text-slate-600">Order: {currentPresenting.order}</p>
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
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Score {currentPresenting.teamName}
              {hasScored && (
                <Badge variant="outline" className="ml-2">
                  Already Scored
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {SCORING_CRITERIA.map((criterion) => (
              <div key={criterion.key} className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{criterion.label}</h4>
                    <p className="text-sm text-slate-600">{criterion.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className="text-2xl font-bold text-blue-600">{scores[criterion.key as keyof Score]}</span>
                    <span className="text-slate-500">/10</span>
                  </div>
                </div>
                <Slider
                  value={[scores[criterion.key as keyof Score]]}
                  onValueChange={(value) => handleScoreChange(criterion.key as keyof Score, value)}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0 - Poor</span>
                  <span>5 - Average</span>
                  <span>10 - Excellent</span>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-slate-900">Total Score</h4>
                <span className="text-3xl font-bold text-green-600">
                  {totalScore}
                  <span className="text-slate-500">/50</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-slate-900">Comments (Optional)</h4>
              <Textarea
                placeholder="Add any additional comments about the presentation..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={submitScore} disabled={submitting} className="w-full" size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : hasScored ? "Update Score" : "Submit Score"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            All Teams Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presentations.map((presentation) => {
              const scored = myScores.some((score) => score.teamId === presentation.teamId)
              const statusColor = {
                waiting: "bg-gray-100 text-gray-800",
                presenting: "bg-blue-100 text-blue-800",
                completed: "bg-green-100 text-green-800",
                skipped: "bg-red-100 text-red-800",
              }[presentation.status]

              return (
                <Card key={presentation._id} className="border">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{presentation.teamName}</h4>
                      {scored && (
                        <Badge variant="outline" className="text-xs">
                          Scored
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">#{presentation.order}</span>
                      <Badge className={`text-xs ${statusColor}`}>{presentation.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
