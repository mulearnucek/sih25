import { NextRequest, NextResponse } from "next/server";
import { connectMongoose } from "@/lib/mongoose";
import Team from "@/models/team";
import Participant from "@/models/participant";
import JoinRequest from "@/models/join-request";

export async function POST(request: NextRequest) {
  try {
    const { teamId, userEmail } = await request.json();

    if (!teamId || !userEmail) {
      return NextResponse.json(
        { success: false, error: "Team ID and user email are required" },
        { status: 400 }
      );
    }

    await connectMongoose();
    
    // Get team details
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if team has available spots
    const totalMembers = team.memberUserIds ? team.memberUserIds.length : 0;
    
    if (totalMembers >= 6) {
      return NextResponse.json(
        { success: false, error: "Team is already full" },
        { status: 400 }
      );
    }

    // Check if user is already in this team
    if (team.leaderUserId === userEmail || (team.memberUserIds && team.memberUserIds.includes(userEmail))) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this team" },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for this team
    const existingRequest = await JoinRequest.findOne({
      teamId: teamId,
      userEmail: userEmail,
      status: 'pending'
    });

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: "You already have a pending request for this team" },
        { status: 400 }
      );
    }

    // Get user details
    const user = await Participant.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already has a team by checking teams collection
    const existingTeamMembership = await Team.findOne({
      $or: [
        { leaderUserId: userEmail },
        { memberUserIds: userEmail }
      ]
    });

    if (existingTeamMembership) {
      return NextResponse.json(
        { success: false, error: "You are already part of a team" },
        { status: 400 }
      );
    }

    // Store the join request
    const joinRequest = new JoinRequest({
      teamId: teamId,
      teamName: team.name,
      userEmail: userEmail,
      userName: user.name,
      userDetails: {
        department: user.fields?.department,
        year: user.fields?.year,
        phone: user.fields?.phone,
        skills: user.fields?.skills || []
      },
      status: 'pending'
    });

    await joinRequest.save();

    return NextResponse.json({ 
      success: true, 
      message: "Join request sent successfully. The team leader can view and manage requests from their dashboard." 
    });

  } catch (error) {
    console.error("Error processing join request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send join request" },
      { status: 500 }
    );
  }
}
