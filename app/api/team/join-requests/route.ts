import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoose } from "@/lib/mongoose";
import JoinRequest from "@/models/join-request";
import Team from "@/models/team";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoose();

    // Find teams where the current user is the leader
    const userTeams = await Team.find({ leaderUserId: session.user.email }).lean();
    
    if (userTeams.length === 0) {
      return NextResponse.json({ success: true, requests: [] });
    }

    // Get all pending join requests for this user's teams
    const teamIds = userTeams.map(team => team._id.toString());
    const joinRequests = await JoinRequest.find({ 
      teamId: { $in: teamIds },
      status: 'pending'
    }).lean();

    return NextResponse.json({ 
      success: true, 
      requests: joinRequests 
    });

  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch join requests" },
      { status: 500 }
    );
  }
}
