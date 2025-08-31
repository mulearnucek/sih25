import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDb } from "@/lib/mongodb"
import * as XLSX from "xlsx"

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
  const participants = await db
    .collection("participants")
    .find({}, { projection: { _id: 0 } })
    .toArray()
  const teams = await db
    .collection("teams")
    .find({}, { projection: { _id: 0 } })
    .toArray()

  const wb = XLSX.utils.book_new()
  const pSheet = XLSX.utils.json_to_sheet(participants)
  const tSheet = XLSX.utils.json_to_sheet(teams)

  XLSX.utils.book_append_sheet(wb, pSheet, "Participants")
  XLSX.utils.book_append_sheet(wb, tSheet, "Teams")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sih-internals-export.xlsx"',
    },
  })
}
