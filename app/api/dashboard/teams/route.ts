import { NextResponse } from "next/server"
import { connectMongoose } from "@/lib/mongoose"
import Team from "@/models/team"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const sessionRaw = await getServerSession(authOptions);
  const session = sessionRaw as { user?: { isAdmin?: boolean } };
  if (!session || !session.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectMongoose();
  const teams = await Team.find({}, { _id: 0, __v: 0 }).lean();
  return NextResponse.json({ teams });
}
