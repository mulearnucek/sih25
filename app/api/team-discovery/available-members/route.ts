import { NextRequest, NextResponse } from "next/server";
import { connectMongoose } from "@/lib/mongoose";
import Team from "@/models/team";
import Participant from "@/models/participant";

export async function GET() {
  try {
    await connectMongoose();
    
    // Get all teams to check membership
    const teams = await Team.find({}).lean();
    const teamMemberEmails = new Set();
    
    teams.forEach(team => {
      if (team.leaderUserId) {
        teamMemberEmails.add(team.leaderUserId);
      }
      if (team.memberUserIds && Array.isArray(team.memberUserIds)) {
        team.memberUserIds.forEach((email: string) => {
          teamMemberEmails.add(email);
        });
      }
    });
    
    // Fetch participants who don't have a team yet
    const participants = await Participant.find({
      $and: [
        {
          $or: [
            { "teamStatus.hasTeam": false },
            { "teamStatus.hasTeam": { $exists: false } },
            { "teamStatus": { $exists: false } }
          ]
        },
        // Also exclude those who are in the teams collection
        { email: { $nin: Array.from(teamMemberEmails) } }
      ]
    }).lean();
    
    return NextResponse.json({ 
      success: true, 
      members: participants.map(participant => ({
        _id: participant._id,
        name: participant.name,
        email: participant.email,
        fields: {
          phone: participant.fields?.phone || null,
          department: participant.fields?.department || null,
          year: participant.fields?.year || null,
          skills: participant.fields?.skills || [],
          bio: participant.fields?.bio || null
        },
        teamStatus: (participant as any).teamStatus || { hasTeam: false }
      }))
    });
  } catch (error) {
    console.error("Error fetching available members:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch available members" },
      { status: 500 }
    );
  }
}
