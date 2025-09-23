import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import JudgingClient from "@/components/judging-client"

export default async function JudgingPage() {
  const session = await getServerSession(authOptions)

  if(!session){
    redirect("/api/auth/signin")
  }

  //@ts-ignore
  if (!session?.user?.isJudge && !session?.user?.isAdmin) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <JudgingClient />
    </div>
  )
}
