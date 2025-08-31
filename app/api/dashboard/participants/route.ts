import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"

function isAdmin(email?: string | null) {
  const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return email && admins.includes(email.toLowerCase())
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await connectMongoose()
  const participants = await Participant.find({}, { _id: 0, __v: 0 }).lean()
  return NextResponse.json({ participants })
}
