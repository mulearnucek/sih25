"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Team {
  _id: string;
  name: string;
  inviteCode: string;
  leaderUserId: string;
  memberUserIds: string[];
  memberCount?: number;
  availableSpots?: number;
  description?: string;
  skillsNeeded?: string[];
  problemStatement?: string;
  createdAt: string;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
  fields: {
    phone?: string;
    department?: string;
    year?: string;
    skills?: string[];
    bio?: string;
  };
  teamStatus: {
    hasTeam: boolean;
    teamName?: string;
    role?: string;
  };
}

export default function TeamDiscoveryPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'teams' | 'members'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userHasTeam, setUserHasTeam] = useState(false);
  const [checkingTeamStatus, setCheckingTeamStatus] = useState(true);
  const [requestedTeams, setRequestedTeams] = useState<Set<string>>(new Set());

  // Check if user already has a team
  useEffect(() => {
    const checkTeamStatus = async () => {
      if (!session?.user?.email) {
        setCheckingTeamStatus(false);
        return;
      }

      try {
        const response = await fetch('/api/team/status');
        if (response.ok) {
          const data = await response.json();
          setUserHasTeam(!!data.team);
        }
      } catch (error) {
        console.error('Failed to check team status:', error);
      } finally {
        setCheckingTeamStatus(false);
      }
    };

    checkTeamStatus();
  }, [session?.user?.email]);

  useEffect(() => {
    if (!checkingTeamStatus && !userHasTeam) {
      fetchData();
    }
  }, [checkingTeamStatus, userHasTeam]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, membersRes, requestsRes] = await Promise.all([
        fetch('/api/team-discovery/teams'),
        fetch('/api/team-discovery/available-members'),
        fetch('/api/user/join-requests')
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setAvailableMembers(membersData.members || []);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequestedTeams(new Set(requestsData.requestedTeamIds || []));
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async (teamId: string) => {
    if (!session?.user?.email) {
      alert('Please sign in to join a team');
      return;
    }

    try {
      const response = await fetch('/api/team-discovery/join-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          userEmail: session.user.email,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Join request sent successfully! The team leader can view and manage your request from their team management page.');
        // Add the team to the requested teams set
        setRequestedTeams(prev => new Set([...prev, teamId]));
      } else {
        alert(data.error || 'Failed to send join request');
      }
    } catch (err) {
      alert('Failed to send join request');
    }
  };

  const handleConnectRequest = async (member: Participant) => {
    if (!session?.user?.email) {
      alert('Please sign in to connect with others');
      return;
    }

    // Check if member has phone number
    if (member.fields?.phone) {
      // Create WhatsApp link with pre-filled message
      const message = encodeURIComponent(`Hello ${member.name}! 👋

I hope you're doing well. I'm ${session.user.name || session.user.email} and I found your profile through the SIH 2025 Team Discovery platform.

🎯 *About SIH 2025 Collaboration:*
I'm actively looking for talented teammates to form a strong team for the Smart India Hackathon 2025. After reviewing your profile, I believe we could work really well together!

👨‍💻 *My Details:*
• Name: ${session.user.name || 'Not provided'}
• Email: ${session.user.email}
• Platform: SIH 2025 - UCEK Registration

🤝 *Why I'm reaching out:*
I'm impressed by your background and think our skills could complement each other perfectly. Building a diverse, skilled team is crucial for SIH success, and I'd love to discuss:

• Our technical strengths and expertise areas
• Problem statement preferences  
• Team formation strategy
• How we can create an innovative solution together

⏰ *Next Steps:*
If you're interested in collaborating, I'd be happy to have a quick chat about our goals and see if we're a good fit as teammates. We can discuss our preferred problem domains and start building our dream team!

Looking forward to potentially working together and creating something amazing! 🚀

Best regards,
${session.user.name || session.user.email}

*P.S. - Feel free to reach out anytime. Early team formation gives us a great advantage!*`);

      // Format phone number (remove any non-digits and add country code if needed)
      let phoneNumber = member.fields.phone.replace(/\D/g, '');
      if (phoneNumber.length === 10) {
        phoneNumber = '91' + phoneNumber; // Add India country code
      }

      const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
      
      // Open WhatsApp
      window.open(whatsappLink, '_blank');
    } else {
      // Fallback to showing contact info
      alert(`Connect with ${member.name}:
📧 Email: ${member.email}
📱 Phone: Not provided

You can reach out via email to start a conversation about SIH 2025 collaboration!`);
    }
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.skillsNeeded?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMembers = availableMembers.filter(member =>
    // Exclude the current user from the members list
    member.email !== session?.user?.email &&
    (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.fields.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.fields.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (checkingTeamStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your team status...</p>
        </div>
      </div>
    );
  }

  if (userHasTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Already on a Team!</h2>
            <p className="text-gray-600 mb-6">
              Great news! You're already part of a team. Team discovery is only available for participants who haven't joined a team yet.
            </p>
            <div className="space-y-3">
              <Link 
                href="/"
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Go to Home
              </Link>
              <p className="text-sm text-gray-500">
                Need to manage your team? Check your registration form for team details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team discovery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-gray-900">SIH 2025</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Team Discovery</h1>
                <p className="text-sm text-gray-500">Find teams to join or teammates to collaborate with</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Registration
              </Link>
              {session?.user?.email && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Tabs */}
        <div className="mb-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={activeTab === 'teams' ? 'Search teams by name, skills needed...' : 'Search members by name, department, skills...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('teams')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teams'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Teams ({filteredTeams.length})
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Members ({filteredMembers.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              // Use the memberCount and availableSpots from the API response
              const memberCount = team.memberCount || team.memberUserIds?.length || 0;
              const spotsAvailable = team.availableSpots !== undefined ? team.availableSpots : (6 - memberCount);
              
              return (
                <div key={team._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        spotsAvailable > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {spotsAvailable > 0 ? `${spotsAvailable} spots left` : 'Full'}
                      </span>
                    </div>
                    
                    {team.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{team.description}</p>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Leader: {team.leaderUserId}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {memberCount}/6 members
                      </div>
                    </div>

                    {team.skillsNeeded && team.skillsNeeded.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Skills Needed:</p>
                        <div className="flex flex-wrap gap-1">
                          {team.skillsNeeded.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {team.skillsNeeded.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{team.skillsNeeded.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleJoinRequest(team._id)}
                      disabled={spotsAvailable === 0 || !session?.user?.email || requestedTeams.has(team._id)}
                      className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors duration-200 ${
                        requestedTeams.has(team._id)
                          ? 'bg-yellow-500 text-white'
                          : spotsAvailable === 0
                          ? 'bg-gray-300 text-gray-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {requestedTeams.has(team._id) 
                        ? 'Requested' 
                        : spotsAvailable === 0 
                        ? 'Team Full' 
                        : 'Request to Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <div key={member._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.fields.department} - Year {member.fields.year}</p>
                    </div>
                  </div>
                  
                  {member.fields.bio && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{member.fields.bio}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {member.email}
                    </div>
                    {member.fields.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {member.fields.phone}
                      </div>
                    )}
                  </div>

                  {member.fields.skills && member.fields.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {member.fields.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {member.fields.skills.length > 3 && (
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{member.fields.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleConnectRequest(member)}
                    disabled={!session?.user?.email || session.user.email === member.email}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {session?.user?.email === member.email ? (
                      'This is you'
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a10 10 0 00-8.94 14.5L2 22l5.7-1.99A10 10 0 1012 2zm0 2a8 8 0 110 16 7.96 7.96 0 01-3.65-.88l-.26-.14-3.38 1.18 1.16-3.3-.17-.28A8 8 0 0112 4zm4.24 9.71c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.36.1-.48.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42-.14 0-.3 0-.46 0-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.72 2.62 4.16 3.68.58.26 1.04.42 1.4.54.58.18 1.1.16 1.52.1.46-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                        </svg>
                        {member.fields?.phone ? 'WhatsApp' : 'Contact'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'teams' && filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No teams found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms or check back later.</p>
          </div>
        )}

        {activeTab === 'members' && filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No available members found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms or check back later.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
