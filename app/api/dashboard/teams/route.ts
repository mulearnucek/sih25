import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return email && admins.includes(email.toLowerCase())
}

export async function GET() {
  const session = await auth()
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getDb()
  const teams = await db
    .collection("teams")
    .find({}, { projection: { _id: 0 } })
    .toArray()
  return NextResponse.json({ teams })
}
