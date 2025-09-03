import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoose } from "@/lib/mongoose";
import JoinRequest from "@/models/join-request";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoose();

    // Get all pending join requests by this user
    const userRequests = await JoinRequest.find({ 
      userEmail: session.user.email,
      status: 'pending'
    }).lean();

    // Extract team IDs
    const teamIds = userRequests.map(req => req.teamId);

    return NextResponse.json({ 
      success: true, 
      requestedTeamIds: teamIds 
    });

  } catch (error) {
    console.error("Error fetching user requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user requests" },
      { status: 500 }
    );
  }
}
