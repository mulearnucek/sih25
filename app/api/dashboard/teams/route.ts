import { NextResponse } from "next/server"
import { connectMongoose } from "@/lib/mongoose"
import Team from "@/models/team"

export async function GET() {
  // Simple authentication removed for basic dashboard access
  // In production, you might want to add proper API authentication
  
  await connectMongoose()
  const teams = await Team.find({}, { _id: 0, __v: 0 }).lean()
  return NextResponse.json({ teams })
}
