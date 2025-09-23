"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Play,
  Pause,
  Clock,
  Users,
  Trophy,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react"
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

interface JudgeProgress {
  judgeId: string
  judgeName: string
  hasSubmitted: boolean
  organization?: string
}

interface JudgeProgressData {
  judgeProgress: JudgeProgress[]
  currentTeam: {
    teamId: string
    teamName: string
    order: number
  } | null
  totalJudges: number
  submittedCount: number
  message?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ControlPanelClient() {
  const [currentTimer, setCurrentTimer] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)
  const [currentTeam, setCurrentTeam] = useState<string | null>(null)
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [newOrder, setNewOrder] = useState<number>(1)
  const { toast } = useToast()

  const {
    data: presentationsData,
    error,
    mutate,
  } = useSWR(
    "/api/judging/presentations",
    fetcher,
    { refreshInterval: 2000 }, // Faster refresh for timer sync
  )

  const { data: judgeProgressData, mutate: mutateJudgeProgress } = useSWR("/api/judging/judge-progress", fetcher, {
    refreshInterval: 5000,
  })

  const presentations = presentationsData?.presentations || []
  const judgeProgressInfo: JudgeProgressData = judgeProgressData || {
    judgeProgress: [],
    currentTeam: null,
    totalJudges: 0,
    submittedCount: 0
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerActive && currentTimer !== null && currentTimer > 0) {
      interval = setInterval(() => {
        setCurrentTimer((prev) => {
          if (prev === null || prev <= 1) {
            setTimerActive(false)
            toast({
              title: "Time's Up",
              description: "Presentation time has ended",
              variant: "default",
            })
            // Broadcast timer end to all judges
            broadcastTimerStatus(0, false)
            return 0
          }
          const newTime = prev - 1
          // Broadcast timer update every 5 seconds
          if (newTime % 5 === 0) {
            broadcastTimerStatus(newTime, true)
          }
          return newTime
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive, currentTimer, toast])

  const broadcastTimerStatus = async (time: number, active: boolean) => {
    try {
      await fetch("/api/judging/timer-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTime: time,
          isActive: active,
          currentTeam: currentTeam,
        }),
      })
    } catch (error) {
      console.error("Failed to broadcast timer status:", error)
    }
  }

  const updateTeamStatus = async (teamId: string, status: string) => {
    try {
      const response = await fetch("/api/judging/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", teamId, status }),
      })

      if (response.ok) {
        mutate() // Refresh data
        if (status === "presenting") {
          setCurrentTeam(teamId)
          setCurrentTimer(600) // 10 minutes
          setTimerActive(false)
          broadcastTimerStatus(600, false)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team status",
        variant: "destructive",
      })
    }
  }

  const removeTeam = async (teamId: string) => {
    try {
      const response = await fetch("/api/judging/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeTeam", teamId }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team removed from presentations",
        })
        mutate()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove team",
        variant: "destructive",
      })
    }
  }

  const updateTeamOrder = async (teamId: string, newOrder: number) => {
    try {
      const response = await fetch("/api/judging/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateOrder", teamId, order: newOrder }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team order updated",
        })
        mutate()
        setEditingOrder(null)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team order",
        variant: "destructive",
      })
    }
  }

  const moveTeam = async (teamId: string, direction: "up" | "down") => {
    const team = presentations.find((p: Presentation) => p.teamId === teamId)
    if (!team) return

    const newOrder = direction === "up" ? team.order - 1 : team.order + 1
    if (newOrder < 1 || newOrder > presentations.length) return

    await updateTeamOrder(teamId, newOrder)
  }

  const startTimer = () => {
    if (currentTimer !== null) {
      setTimerActive(true)
      broadcastTimerStatus(currentTimer, true)
    }
  }

  const pauseTimer = () => {
    setTimerActive(false)
    if (currentTimer !== null) {
      broadcastTimerStatus(currentTimer, false)
    }
  }

  const resetTimer = () => {
    setCurrentTimer(600)
    setTimerActive(false)
    broadcastTimerStatus(600, false)
  }

  const resetAllStates = async () => {
    try {
      const response = await fetch("/api/judging/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetAll" }),
      })

      if (response.ok) {
        setCurrentTimer(null)
        setTimerActive(false)
        setCurrentTeam(null)
        broadcastTimerStatus(0, false)
        toast({
          title: "Reset Complete",
          description: "All presentation states have been reset",
        })
        mutate()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset states",
        variant: "destructive",
      })
    }
  }

  const nextTeam = async () => {
    try {
      // Find current presenting team
      const currentPresenting = presentations.find((p: Presentation) => p.status === "presenting")
      
      if (currentPresenting) {
        // Mark current team as completed
        await updateTeamStatus(currentPresenting.teamId, "completed")
      }

      // Find next team in order that is waiting
      const waitingTeams = presentations
        .filter((p: Presentation) => p.status === "waiting" && p.isParticipating)
        .sort((a: Presentation, b: Presentation) => a.order - b.order)

      if (waitingTeams.length > 0) {
        const nextTeam = waitingTeams[0]
        // Start presenting the next team
        await updateTeamStatus(nextTeam.teamId, "presenting")
        
        toast({
          title: "Next Team",
          description: `${nextTeam.teamName} is now presenting`,
        })
      } else {
        toast({
          title: "No More Teams",
          description: "All teams have completed their presentations",
          variant: "default",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to progress to next team",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-gray-100 text-gray-800"
      case "presenting":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "skipped":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const currentPresenting = presentations.find((p: Presentation) => p.status === "presenting")

  return (
    <div className="space-y-6">
      {/* Current Presentation Card with Timer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Current Presentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentPresenting ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{currentPresenting.teamName}</h3>
                  <p className="text-slate-600">Order: {currentPresenting.order}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Presenting
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div
                    className={`text-4xl font-mono font-bold mb-2 ${
                      currentTimer !== null && currentTimer <= 60 ? "text-red-600" : "text-blue-600"
                    }`}
                  >
                    {currentTimer !== null ? formatTime(currentTimer) : "10:00"}
                  </div>
                  {currentTimer === 0 && <div className="text-red-600 font-semibold text-sm">Time's Up!</div>}
                </div>

                <div className="flex gap-2">
                  <Button onClick={startTimer} disabled={!currentTeam || timerActive} size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                  <Button onClick={pauseTimer} disabled={!timerActive} variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                  <Button onClick={resetTimer} variant="outline" size="sm">
                    Reset
                  </Button>
                  <Button onClick={nextTeam} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Next Team
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team is currently presenting</p>
              <p className="text-sm">Select a team to start presenting</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Judge Scoring Progress
            {judgeProgressInfo.currentTeam && (
              <span className="text-sm font-normal text-slate-600">
                - {judgeProgressInfo.currentTeam.teamName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {judgeProgressInfo.currentTeam ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Current Team: {judgeProgressInfo.currentTeam.teamName}</h4>
                  <p className="text-sm text-slate-600">Order #{judgeProgressInfo.currentTeam.order}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {judgeProgressInfo.submittedCount} / {judgeProgressInfo.totalJudges}
                  </div>
                  <div className="text-sm text-slate-600">Judges Submitted</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {judgeProgressInfo.judgeProgress.map((judge: JudgeProgress) => (
                  <div key={judge.judgeId} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-medium text-sm">{judge.judgeName}</h5>
                        {judge.organization && (
                          <p className="text-xs text-slate-500">{judge.organization}</p>
                        )}
                      </div>
                      <Badge 
                        variant={judge.hasSubmitted ? "default" : "secondary"}
                        className={judge.hasSubmitted ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                      >
                        {judge.hasSubmitted ? "✓ Submitted" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team is currently presenting</p>
              <p className="text-sm">Judge progress will be shown when a team starts presenting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={nextTeam} className="bg-green-600 hover:bg-green-700">
              <ChevronRight className="h-4 w-4 mr-2" />
              Next Team
            </Button>
            <Button onClick={() => window.open("/judging", "_blank")} variant="outline">
              <Trophy className="h-4 w-4 mr-2" />
              Open Judge Interface
            </Button>
            <Button onClick={() => window.open("/leaderboard", "_blank")} variant="outline">
              View Leaderboard
            </Button>
            <Button onClick={() => mutate()} variant="outline" size="sm">
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
                  {presentations.map((presentation: Presentation) => (
                    <Card key={presentation._id} className="border">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{presentation.teamName}</h4>
                          <Badge className={getStatusColor(presentation.status)}>{presentation.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Order: {presentation.order}</span>
                          {presentation.isParticipating ? (
                            <span className="text-green-600">Participating</span>
                          ) : (
                            <span className="text-red-600">Not Participating</span>
                          )}
                        </div>
                        {presentation.startTime && (
                          <div className="text-xs text-slate-500 mt-1">
                            Started: {new Date(presentation.startTime).toLocaleTimeString()}
                          </div>
                        )}
                        {presentation.endTime && (
                          <div className="text-xs text-slate-500">
                            Ended: {new Date(presentation.endTime).toLocaleTimeString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All States
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset All States</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all presentation states, timer, and current team. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllStates}>Reset All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Presentations ({presentations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {presentations
              .sort((a: Presentation, b: Presentation) => a.order - b.order)
              .map((presentation: Presentation) => (
                <div
                  key={presentation._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {editingOrder === presentation.teamId ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={newOrder}
                            onChange={(e) => setNewOrder(Number.parseInt(e.target.value))}
                            className="w-16 h-8 text-sm"
                            min={1}
                            max={presentations.length}
                          />
                          <Button
                            size="sm"
                            onClick={() => updateTeamOrder(presentation.teamId, newOrder)}
                            className="h-8 px-2"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingOrder(null)}
                            className="h-8 px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono w-8 text-center">#{presentation.order}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOrder(presentation.teamId)
                              setNewOrder(presentation.order)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTeam(presentation.teamId, "up")}
                            disabled={presentation.order === 1}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveTeam(presentation.teamId, "down")}
                            disabled={presentation.order === presentations.length}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold">{presentation.teamName}</h3>
                      {!presentation.isParticipating && <p className="text-sm text-red-600">Not Participating</p>}
                    </div>

                    <Badge className={getStatusColor(presentation.status)}>{presentation.status}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={presentation.status === "presenting" ? "default" : "outline"}
                      onClick={() => updateTeamStatus(presentation.teamId, "presenting")}
                      disabled={presentation.status === "presenting" || !presentation.isParticipating}
                    >
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTeamStatus(presentation.teamId, "completed")}
                      disabled={presentation.status === "completed"}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTeamStatus(presentation.teamId, "skipped")}
                      disabled={presentation.status === "skipped"}
                    >
                      Skip
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {presentation.teamName} from the presentation list? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeTeam(presentation.teamId)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
