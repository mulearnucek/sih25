import { NextRequest, NextResponse } from "next/server"
import { connectMongoose } from "@/lib/mongoose"
import Team from "@/models/team"
import Participant from "@/models/participant"

export async function POST(req: NextRequest) {
  try {
    await connectMongoose()
    
    console.log('Starting test member removal process...')

    // Find Tekions team
    const tekionsTeam = await Team.findOne({ name: 'Tekions' })
    if (!tekionsTeam) {
      return NextResponse.json({ error: "Tekions team not found" }, { status: 404 })
    }

    console.log('Current Tekions team members:', tekionsTeam.memberUserIds)
    console.log('Current member count:', tekionsTeam.memberUserIds?.length || 0)

    // Test member emails to remove (from both script and API)
    const testMemberEmails = [
      // From the original script
      'test1@example.com',
      'test2@example.com', 
      'test3@example.com',
      'test4@example.com',
      'test5@example.com',
      // From the API endpoint
      'testmember1@tekions.com',
      'testmember2@tekions.com',
      'testmember3@tekions.com',
      'testmember4@tekions.com',
      'testmember5@tekions.com'
    ]

    // Find which test members are actually in the team
    const currentMembers = tekionsTeam.memberUserIds || []
    const membersToRemove = currentMembers.filter(email => 
      testMemberEmails.includes(email)
    )

    console.log('Members found in team to remove:', membersToRemove)

    if (membersToRemove.length === 0) {
      return NextResponse.json({ 
        message: 'No test members found in the Tekions team to remove.',
        currentMembers: currentMembers
      })
    }

    const removedParticipants = []

    // Remove participants from database
    console.log('Removing participants from database...')
    for (const email of membersToRemove) {
      const participant = await Participant.findOne({ email: email })
      if (participant) {
        await Participant.deleteOne({ email: email })
        removedParticipants.push({
          email: email,
          name: participant.name || 'Unknown',
          status: 'removed'
        })
        console.log(`✓ Removed participant: ${email}`)
      } else {
        removedParticipants.push({
          email: email,
          name: 'Unknown',
          status: 'not_found_in_db'
        })
        console.log(`- Participant not found in database: ${email}`)
      }
    }

    // Remove members from team
    console.log('Removing members from team...')
    const updatedMemberUserIds = currentMembers.filter(email => 
      !testMemberEmails.includes(email)
    )

    await Team.updateOne(
      { _id: tekionsTeam._id },
      { 
        $set: { 
          memberUserIds: updatedMemberUserIds,
          updatedAt: new Date()
        }
      }
    )

    console.log('✅ Successfully removed test members from Tekions team')

    return NextResponse.json({
      success: true,
      message: 'Successfully removed test members from Tekions team',
      summary: {
        previousMemberCount: currentMembers.length,
        newMemberCount: updatedMemberUserIds.length,
        removedCount: membersToRemove.length,
        removedMembers: removedParticipants,
        remainingMembers: updatedMemberUserIds
      }
    })

  } catch (error) {
    console.error('❌ Error removing test members:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
