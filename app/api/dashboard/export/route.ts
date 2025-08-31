import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { connectMongoose } from "@/lib/mongoose"
import Participant from "@/models/participant"
import Team from "@/models/team"
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
  const teams = await Team.find({}, { _id: 0, __v: 0 }).lean()

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
