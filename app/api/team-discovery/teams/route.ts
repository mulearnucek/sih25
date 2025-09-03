import { NextRequest, NextResponse } from "next/server";
import { connectMongoose } from "@/lib/mongoose";
import Team from "@/models/team";

export async function GET() {
  try {
    await connectMongoose();
    
    // Fetch teams that have available spots (less than 6 members)
    const teams = await Team.find({}).lean();
    
    // Filter teams to only show those with available spots
    const availableTeams = teams.filter(team => {
      // The memberUserIds array includes all team members including the leader
      const totalMembers = team.memberUserIds ? team.memberUserIds.length : 0;
      return totalMembers < 6;
    });
    
    return NextResponse.json({ 
      success: true, 
      teams: availableTeams.map(team => ({
        _id: team._id,
        name: team.name,
        inviteCode: team.inviteCode,
        leaderUserId: team.leaderUserId,
        memberUserIds: team.memberUserIds || [],
        memberCount: team.memberUserIds ? team.memberUserIds.length : 0,
        availableSpots: 6 - (team.memberUserIds ? team.memberUserIds.length : 0),
        description: team.description || null,
        skillsNeeded: team.skillsNeeded || [],
        problemStatement: team.problemStatement || null,
        createdAt: (team as any).createdAt?.toString() || new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
