import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    
    // Get collection stats
    const teamsCount = await db.collection("teams").countDocuments();
    const participantsCount = await db.collection("participants").countDocuments();
    
    // Get sample data
    const sampleTeams = await db.collection("teams").find({}).limit(3).toArray();
    const sampleParticipants = await db.collection("participants").find({}).limit(3).toArray();
    
    return NextResponse.json({ 
      success: true,
      stats: {
        teamsCount,
        participantsCount
      },
      samples: {
        teams: sampleTeams,
        participants: sampleParticipants
      }
    });
  } catch (error) {
    console.error("Error checking database:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
