const mongoose = require('mongoose');

// Connect to MongoDB (using environment variable or default)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih25';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const participantSchema = new mongoose.Schema({
  email: String,
  name: String,
  userId: String,
  gender: String,
  fields: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const teamSchema = new mongoose.Schema({
  name: String,
  leaderUserId: String,
  memberUserIds: [String],
  inviteCode: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Participant = mongoose.model('Participant', participantSchema);
const Team = mongoose.model('Team', teamSchema);

async function removeTestMembers() {
  try {
    console.log('Starting test member removal process...\n');

    // Find Tekions team
    const tekionsTeam = await Team.findOne({ name: 'Tekions' });
    if (!tekionsTeam) {
      console.log('Tekions team not found');
      return;
    }

    console.log('Current Tekions team members:', tekionsTeam.memberUserIds);
    console.log('Current member count:', tekionsTeam.memberUserIds.length);

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
    ];

    console.log('\nTest member emails to remove:', testMemberEmails);

    // Find which test members are actually in the team
    const membersToRemove = tekionsTeam.memberUserIds.filter(email => 
      testMemberEmails.includes(email)
    );

    console.log('\nMembers found in team to remove:', membersToRemove);

    if (membersToRemove.length === 0) {
      console.log('No test members found in the Tekions team to remove.');
      return;
    }

    // Remove participants from database
    console.log('\nRemoving participants from database...');
    for (const email of membersToRemove) {
      const result = await Participant.deleteOne({ email: email });
      if (result.deletedCount > 0) {
        console.log(`✓ Removed participant: ${email}`);
      } else {
        console.log(`- Participant not found in database: ${email}`);
      }
    }

    // Remove members from team
    console.log('\nRemoving members from team...');
    const updatedMemberUserIds = tekionsTeam.memberUserIds.filter(email => 
      !testMemberEmails.includes(email)
    );

    await Team.updateOne(
      { _id: tekionsTeam._id },
      { 
        $set: { 
          memberUserIds: updatedMemberUserIds,
          updatedAt: new Date()
        }
      }
    );

    console.log('\n✅ Successfully removed test members from Tekions team');
    console.log('Previous member count:', tekionsTeam.memberUserIds.length);
    console.log('New member count:', updatedMemberUserIds.length);
    console.log('Remaining team members:', updatedMemberUserIds);

    // Show summary
    console.log('\n📊 REMOVAL SUMMARY:');
    console.log(`- Removed ${membersToRemove.length} test members`);
    console.log(`- Team now has ${updatedMemberUserIds.length} members`);
    console.log('- Remaining members are original team members');

  } catch (error) {
    console.error('❌ Error removing test members:', error);
  } finally {
    console.log('\nClosing database connection...');
    mongoose.connection.close();
  }
}

// Run the removal function
removeTestMembers();
