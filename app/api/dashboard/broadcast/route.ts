import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import { sendBroadcastEmail } from "@/lib/email"

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return email && admins.includes(email.toLowerCase())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { subject, message } = await req.json().catch(() => ({}))
  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
  }

  const db = await getDb()
  const emails = await db
    .collection("participants")
    .find({}, { projection: { email: 1, _id: 0 } })
    .toArray()
  const to = emails.map((e: any) => e.email).filter(Boolean)
  if (to.length === 0) return NextResponse.json({ ok: true, info: "No recipients" })
  try {
    await sendBroadcastEmail(to, subject, message)
    return NextResponse.json({ ok: true, count: to.length })
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to send emails", detail: e?.message }, { status: 500 })
  }
}
