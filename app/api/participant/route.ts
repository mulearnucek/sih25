import { type NextRequest, NextResponse } from "next/server"
import { auth, authOptions } from "@/lib/auth"
import { connectMongoose } from "@/lib/mongoose"
import { getServerSession } from 'next-auth/next';
import Participant from "@/models/participant"
import { sendRegistrationEmail } from "@/lib/email"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await connectMongoose()
  const participant = await Participant.findOne({ email: session.user.email }).lean()
  return NextResponse.json({ participant, sessionUser: session.user })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const { fields } = body as { fields: Record<string, string> }

  if (!fields || typeof fields !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const email = session.user.email
  const name = fields.name
  const gender = fields.gender

  if (!name || !gender) {
    return NextResponse.json({ error: "Missing required fields: name, gender" }, { status: 400 })
  }

  await connectMongoose()
  const existing = await Participant.findOne({ email })

  if (existing) {
    await Participant.updateOne(
      { email },
      {
        $set: {
          name,
          gender,
          email,
          userId: email,
          fields,
          updatedAt: new Date(),
        },
      },
    )
    return NextResponse.json({ ok: true, updated: true })
  } else {
    await Participant.create({
      name,
      gender,
      email,
      userId: email,
      fields,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    try {
      await sendRegistrationEmail(email, name)
    } catch (e) {
      console.log("[v0] email send error", (e as Error).message)
    }
    return NextResponse.json({ ok: true, created: true })
  }
}
