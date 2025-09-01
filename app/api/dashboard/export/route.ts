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
  const participantsRaw = await Participant.find({}, { _id: 0, __v: 0 }).lean()
  const teamsRaw = await Team.find({}, { _id: 0, __v: 0 }).lean()

  const wb = XLSX.utils.book_new()
  // Collect all distinct dynamic field keys
  const dynamicKeys = new Set<string>()
  for (const p of participantsRaw) {
    if (p.fields && typeof p.fields === 'object') {
      for (const k of Object.keys(p.fields)) dynamicKeys.add(k)
    }
  }
  const orderedDynamicKeys = Array.from(dynamicKeys).sort()

  // Flatten participants
  const participants = participantsRaw.map(p => {
    const base: any = { ...p }
    delete base.fields
    for (const k of orderedDynamicKeys) {
      base[k] = p.fields?.[k] ?? ''
    }
    return base
  })

  const pSheet = XLSX.utils.json_to_sheet(participants)

  // Flatten team arrays for better spreadsheet readability
  const teams = teamsRaw.map((t:any) => ({
    ...t,
    memberCount: Array.isArray(t.memberUserIds) ? t.memberUserIds.length : 0,
    memberUserIds: Array.isArray(t.memberUserIds) ? t.memberUserIds.join(', ') : ''
  }))
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
