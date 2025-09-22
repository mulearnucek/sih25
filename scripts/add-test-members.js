const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sih25', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const participantSchema = new mongoose.Schema({
  email: String,
  name: String,
  phone: String,
  gender: String,
  college: String,
  branch: String,
  year: String,
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

async function addTestMembers() {
  try {
    // Find Tekions team
    const tekionsTeam = await Team.findOne({ name: 'Tekions' });
    if (!tekionsTeam) {
      console.log('Tekions team not found');
      return;
    }

    console.log('Current Tekions team:', tekionsTeam);
    console.log('Current member count:', tekionsTeam.memberUserIds.length);

    // Test members to add (mix of male and female)
    const testMembers = [
      {
        email: 'test1@example.com',
        name: 'Test Member 1',
        phone: '+91-9876543210',
        gender: 'Male',
        college: 'Test College',
        branch: 'Computer Science',
        year: '3rd Year'
      },
      {
        email: 'test2@example.com',
        name: 'Test Member 2',
        phone: '+91-9876543211',
        gender: 'Male',
        college: 'Test College',
        branch: 'Information Technology',
        year: '2nd Year'
      },
      {
        email: 'test3@example.com',
        name: 'Test Member 3',
        phone: '+91-9876543212',
        gender: 'Male',
        college: 'Test College',
        branch: 'Electronics',
        year: '4th Year'
      },
      {
        email: 'test4@example.com',
        name: 'Test Member 4',
        phone: '+91-9876543213',
        gender: 'Female',
        college: 'Test College',
        branch: 'Mechanical',
        year: '3rd Year'
      }
    ];

    // Calculate how many members we need to add (max 6 total)
    const currentCount = tekionsTeam.memberUserIds.length;
    const membersToAdd = Math.min(testMembers.length, 6 - currentCount);

    if (membersToAdd <= 0) {
      console.log('Tekions team is already full or has enough members');
      return;
    }

    console.log(`Adding ${membersToAdd} test members...`);

    // Add participants to database
    for (let i = 0; i < membersToAdd; i++) {
      const member = testMembers[i];
      
      // Check if participant already exists
      const existingParticipant = await Participant.findOne({ email: member.email });
      if (!existingParticipant) {
        await Participant.create(member);
        console.log(`Created participant: ${member.name} (${member.email})`);
      } else {
        console.log(`Participant already exists: ${member.email}`);
      }

      // Add to team if not already a member
      if (!tekionsTeam.memberUserIds.includes(member.email)) {
        tekionsTeam.memberUserIds.push(member.email);
      }
    }

    // Update team
    await Team.updateOne(
      { _id: tekionsTeam._id },
      { 
        $set: { 
          memberUserIds: tekionsTeam.memberUserIds,
          updatedAt: new Date()
        }
      }
    );

    console.log('Successfully added test members to Tekions team');
    console.log('New member count:', tekionsTeam.memberUserIds.length);
    console.log('Team members:', tekionsTeam.memberUserIds);

  } catch (error) {
    console.error('Error adding test members:', error);
  } finally {
    mongoose.connection.close();
  }
}

addTestMembers();
