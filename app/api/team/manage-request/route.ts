import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoose } from "@/lib/mongoose";
import JoinRequest from "@/models/join-request";
import Team from "@/models/team";
import Participant from "@/models/participant";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action } = body; // action: 'accept' | 'reject'

    if (!requestId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectMongoose();

    // Find the join request
    const joinRequest = await JoinRequest.findById(requestId);
    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    // Verify that the current user is the team leader
    const team = await Team.findById(joinRequest.teamId);
    if (!team || team.leaderUserId !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized: You are not the team leader" }, { status: 403 });
    }

    if (action === 'reject') {
      // Simply update the request status to rejected
      await JoinRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
      return NextResponse.json({ success: true, message: "Join request rejected" });
    }

    if (action === 'accept') {
      // Check if the team still has available spots
      const currentMemberCount = team.memberUserIds ? team.memberUserIds.length : 0;
      if (currentMemberCount >= 6) {
        return NextResponse.json({ error: "Team is already full" }, { status: 400 });
      }

      // Check if the user is still available (not in another team)
      const userEmail = joinRequest.userEmail;
      
      // Check in participants collection for team status
      const participant = await Participant.findOne({ email: userEmail });
      if (!participant) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if user is already in a team in the teams collection
      const existingTeamMembership = await Team.findOne({
        $or: [
          { leaderUserId: userEmail },
          { memberUserIds: userEmail }
        ]
      });

      if (existingTeamMembership) {
        // Delete the request since user is already in a team
        await JoinRequest.findByIdAndDelete(requestId);
        return NextResponse.json({ 
          success: true,
          message: "User is already in a team. Request has been removed.",
          userAlreadyInTeam: true
        }, { status: 200 });
      }

      // Add user to the team
      await Team.findByIdAndUpdate(joinRequest.teamId, {
        $push: { memberUserIds: userEmail }
      });

      // Update the participant's team status
      await Participant.findOneAndUpdate(
        { email: userEmail },
        { 'teamStatus.hasTeam': true }
      );

      // Update the join request status
      await JoinRequest.findByIdAndUpdate(requestId, { status: 'accepted' });

      return NextResponse.json({ 
        success: true, 
        message: "Join request accepted and user added to team" 
      });
    }

  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process join request" },
      { status: 500 }
    );
  }
}
