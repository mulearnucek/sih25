import { NextRequest, NextResponse } from "next/server";
import { connectMongoose } from "@/lib/mongoose";
import Team from "@/models/team";
import Participant from "@/models/participant";
import ConnectionRequest from "@/models/connection-request";

export async function POST(request: NextRequest) {
  try {
    const { fromEmail, toEmail } = await request.json();

    if (!fromEmail || !toEmail) {
      return NextResponse.json(
        { success: false, error: "Both sender and recipient emails are required" },
        { status: 400 }
      );
    }

    if (fromEmail === toEmail) {
      return NextResponse.json(
        { success: false, error: "You cannot connect with yourself" },
        { status: 400 }
      );
    }

    await connectMongoose();
    
    // Get both user details
    const [fromUser, toUser] = await Promise.all([
      Participant.findOne({ email: fromEmail }),
      Participant.findOne({ email: toEmail })
    ]);

    if (!fromUser || !toUser) {
      return NextResponse.json(
        { success: false, error: "One or both users not found" },
        { status: 404 }
      );
    }

    // Check if both users are available (not in a team) by checking teams collection
    const [fromUserTeam, toUserTeam] = await Promise.all([
      Team.findOne({
        $or: [
          { leaderUserId: fromEmail },
          { memberUserIds: fromEmail }
        ]
      }),
      Team.findOne({
        $or: [
          { leaderUserId: toEmail },
          { memberUserIds: toEmail }
        ]
      })
    ]);

    if (fromUserTeam) {
      return NextResponse.json(
        { success: false, error: "You are already part of a team" },
        { status: 400 }
      );
    }

    if (toUserTeam) {
      return NextResponse.json(
        { success: false, error: "The person you're trying to connect with is already in a team" },
        { status: 400 }
      );
    }

    // Store the connection request
    const connectionRequest = new ConnectionRequest({
      fromEmail: fromEmail,
      fromName: fromUser.name,
      toEmail: toEmail,
      toName: toUser.name,
      fromUserDetails: {
        department: fromUser.fields?.department,
        year: fromUser.fields?.year,
        phone: fromUser.fields?.phone,
        skills: fromUser.fields?.skills || []
      },
      status: 'pending'
    });

    await connectionRequest.save();

    // Send email notification to the recipient
    try {
      const emailSubject = `Team-up Request from ${fromUser.name} - SIH 2025`;
      const emailBody = `
        <h2>Someone wants to team up with you!</h2>
        <p>Hello ${toUser.name},</p>
        <p><strong>${fromUser.name}</strong> is interested in teaming up with you for SIH 2025.</p>
        
        <h3>Their Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${fromUser.name}</li>
          <li><strong>Email:</strong> ${fromUser.email}</li>
          <li><strong>Department:</strong> ${fromUser.fields?.department || 'N/A'}</li>
          <li><strong>Year:</strong> ${fromUser.fields?.year || 'N/A'}</li>
          <li><strong>Phone:</strong> ${fromUser.fields?.phone || 'N/A'}</li>
          ${fromUser.fields?.skills && fromUser.fields.skills.length > 0 ? 
            `<li><strong>Skills:</strong> ${fromUser.fields.skills.join(', ')}</li>` : 
            ''
          }
        </ul>
        
        <p>If you're interested in collaborating, please reach out to them directly using the contact information above.</p>
        
        <p>Remember, teams need exactly 6 members with at least 1 female member. This could be a great opportunity to start building your team!</p>
        
        <hr>
        <p><em>This is an automated message from SIH 2025 Team Discovery System.</em></p>
      `;

      // TODO: Set up email function
      // await sendEmail(toEmail, emailSubject, emailBody);
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: "Connection request sent successfully. They will be notified via email." 
    });

  } catch (error) {
    console.error("Error processing connection request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send connection request" },
      { status: 500 }
    );
  }
}
