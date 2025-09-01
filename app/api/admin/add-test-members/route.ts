import { NextRequest, NextResponse } from "next/server"
import { connectMongoose } from "@/lib/mongoose"
import Team from "@/models/team"
import Participant from "@/models/participant"
import fs from 'fs'
import path from 'path'

// Function to extract test members from the script file
function getTestMembersFromScript() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'add-test-members.js')
    const scriptContent = fs.readFileSync(scriptPath, 'utf8')
    
    // Extract the testMembers array from the script
    const testMembersMatch = scriptContent.match(/const testMembers = \[([\s\S]*?)\];/)
    if (!testMembersMatch) {
      throw new Error('Could not find testMembers array in script')
    }
    
    // Parse the testMembers array
    const testMembersArrayStr = `[${testMembersMatch[1]}]`
    const testMembers = eval(testMembersArrayStr)
    
    // Convert to API format (change emails to @tekions.com)
    return testMembers.map((member: any, index: number) => ({
      ...member,
      email: `testmember${index + 1}@tekions.com`
    }))
  } catch (error) {
    console.error('Error reading test members from script:', error)
    // Fallback to current members if script reading fails
    return [
      {
        email: 'testmember1@tekions.com',
        name: 'Test Member 1',
        phone: '+91-9876543210',
        gender: 'Male',
        college: 'Test College',
        branch: 'Computer Science',
        year: '3rd Year'
      },
      {
        email: 'testmember2@tekions.com',
        name: 'Test Member 2',
        phone: '+91-9876543211',
        gender: 'Male',
        college: 'Test College',
        branch: 'Information Technology',
        year: '2nd Year'
      },
      {
        email: 'testmember3@tekions.com',
        name: 'Test Member 3',
        phone: '+91-9876543212',
        gender: 'Male',
        college: 'Test College',
        branch: 'Electronics',
        year: '4th Year'
      },
      {
        email: 'testmember4@tekions.com',
        name: 'Test Member 4',
        phone: '+91-9876543213',
        gender: 'Female',
        college: 'Test College',
        branch: 'Mechanical',
        year: '3rd Year'
      }
    ]
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongoose()
    
    // Find Tekions team
    const tekionsTeam = await Team.findOne({ name: 'Tekions' })
    if (!tekionsTeam) {
      return NextResponse.json({ error: "Tekions team not found" }, { status: 404 })
    }

    // Get test members dynamically from script file
    const testMembers = getTestMembersFromScript()

    console.log('🔄 Dynamically loaded test members from script:', testMembers.map(m => ({ name: m.name, gender: m.gender, email: m.email })))

    // Calculate how many members we need to add (max 6 total)
    const currentCount = tekionsTeam.memberUserIds?.length || 0
    const membersToAdd = Math.min(testMembers.length, 6 - currentCount)

    if (membersToAdd <= 0) {
      return NextResponse.json({ 
        message: 'Tekions team is already full or has enough members',
        currentCount,
        currentMembers: tekionsTeam.memberUserIds
      })
    }

    const addedMembers = []
    const newMemberUserIds = [...(tekionsTeam.memberUserIds || [])]

    // Add participants to database
    for (let i = 0; i < membersToAdd; i++) {
      const member = testMembers[i]
      
      // Check if participant already exists
      const existingParticipant = await Participant.findOne({ email: member.email })
      if (!existingParticipant) {
        await Participant.create({
          name: member.name,
          email: member.email,
          userId: member.email, // userId should match email
          gender: member.gender,
          fields: {
            phone: member.phone,
            college: member.college,
            branch: member.branch,
            year: member.year
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }

      // Add to team if not already a member
      if (!newMemberUserIds.includes(member.email)) {
        newMemberUserIds.push(member.email)
        addedMembers.push(member)
      }
    }

    // Update team
    await Team.updateOne(
      { _id: tekionsTeam._id },
      { 
        $set: { 
          memberUserIds: newMemberUserIds,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Successfully added test members to Tekions team',
      addedMembers: addedMembers.map(m => ({ name: m.name, email: m.email, gender: m.gender })),
      newMemberCount: newMemberUserIds.length,
      teamMembers: newMemberUserIds
    })

  } catch (error) {
    console.error('Error adding test members:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
