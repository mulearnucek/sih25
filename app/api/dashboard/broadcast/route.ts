import { type NextRequest, NextResponse } from "next/server"
import { sendBroadcastEmail } from "@/lib/email"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"

export async function POST(req: NextRequest) {
  // Simple authentication removed for basic dashboard access
  // In production, you might want to add proper API authentication
  
  const { subject, message } = await req.json().catch(() => ({}))
  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
  }

  await connectMongoose()
  const emails = await Participant.find({}, { email: 1, _id: 0 }).lean()
  const to = emails.map((e: any) => e.email).filter(Boolean)

  if (to.length === 0) return NextResponse.json({ ok: true, info: "No recipients" })
  try {
    await sendBroadcastEmail(to, subject, message)
    return NextResponse.json({ ok: true, count: to.length })
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to send emails", detail: e?.message }, { status: 500 })
  }
}
