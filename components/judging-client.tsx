"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trophy, Clock, Users, Star, Send, RefreshCw, Eye } from "lucide-react"
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function JudgingClient() {
  const { data: session } = useSession()
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
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false)
  const { toast } = useToast()

  const {
    data: presentationsData,
    error: presentationsError,
    mutate: mutatePresentations,
  } = useSWR(
    "/api/judging/presentations",
    fetcher,
    { refreshInterval: 10000 }, // Refresh every 10 seconds
  )

  const {
    data: scoresData,
    error: scoresError,
    mutate: mutateScores,
  } = useSWR(session?.user?.email ? `/api/judging/scores?judgeId=${session.user.email}` : null, fetcher, {
    refreshInterval: 10000,
  })

  const presentations = presentationsData?.presentations || []
  const myScores = scoresData?.scores || []

  useEffect(() => {
    const presenting = presentations.find((p: Presentation) => p.status === "presenting")
    setCurrentPresenting(presenting || null)
  }, [presentations])

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

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const hasScored = myScores.some((score: any) => score.teamId === currentPresenting?.teamId)

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Judge Scoring Interface</h1>
          <p className="text-slate-600 text-sm sm:text-base">Welcome, {session?.user?.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              mutatePresentations()
              mutateScores()
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {presentations.map((presentation: Presentation) => {
                  const scored = myScores.some((score: any) => score.teamId === presentation.teamId)
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
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Team Status */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-5 w-5" />
            Current Presentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPresenting ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold">{currentPresenting.teamName}</h3>
                <p className="text-slate-600">Order: {currentPresenting.order}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 self-start sm:self-center">
                <Clock className="h-3 w-3 mr-1" />
                Presenting
              </Badge>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-slate-500">
              <Clock className="h-8 sm:h-12 w-8 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No team is currently presenting</p>
              <p className="text-xs sm:text-sm">Please wait for the next presentation to begin</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring Interface */}
      {currentPresenting && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Score {currentPresenting.teamName}
              </div>
              {hasScored && (
                <Badge variant="outline" className="ml-0 sm:ml-2">
                  Already Scored
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {SCORING_CRITERIA.map((criterion) => (
              <div key={criterion.key} className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 text-sm sm:text-base">{criterion.label}</h4>
                    <p className="text-xs sm:text-sm text-slate-600">{criterion.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">
                      {scores[criterion.key as keyof Score]}
                    </span>
                    <span className="text-slate-500 text-sm sm:text-base">/10</span>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="font-medium text-slate-900">Total Score</h4>
                <span className="text-2xl sm:text-3xl font-bold text-green-600">
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
                className="resize-none"
              />
            </div>

            <Button onClick={submitScore} disabled={submitting} className="w-full" size="lg">
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : hasScored ? "Update Score" : "Submit Score"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Progress - Compact view for mobile */}
      <Card className="block sm:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Teams Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {presentations.slice(0, 5).map((presentation: Presentation) => {
              const scored = myScores.some((score: any) => score.teamId === presentation.teamId)
              const statusColor = {
                waiting: "bg-gray-100 text-gray-800",
                presenting: "bg-blue-100 text-blue-800",
                completed: "bg-green-100 text-green-800",
                skipped: "bg-red-100 text-red-800",
              }[presentation.status]

              return (
                <div key={presentation._id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{presentation.teamName}</span>
                      {scored && (
                        <Badge variant="outline" className="text-xs">
                          Scored
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">#{presentation.order}</span>
                  </div>
                  <Badge className={`text-xs ${statusColor}`}>{presentation.status}</Badge>
                </div>
              )
            })}
            {presentations.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 bg-transparent"
                onClick={() => setShowAllTeamsModal(true)}
              >
                View All {presentations.length} Teams
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Progress - Full view for larger screens */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            All Teams Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {presentations.map((presentation: Presentation) => {
              const scored = myScores.some((score: any) => score.teamId === presentation.teamId)
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
