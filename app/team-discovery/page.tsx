'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

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

export default function TeamDiscoveryPage() {
  const { data: session, status } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestedTeams, setRequestedTeams] = useState<Set<string>>(new Set());
  const [userHasTeam, setUserHasTeam] = useState(false);
  const [checkingTeamStatus, setCheckingTeamStatus] = useState(true);

  // Fetch teams and requests data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, requestsRes] = await Promise.all([
        fetch('/api/team-discovery/teams'),
        fetch('/api/user/join-requests')
      ]);

      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        // API returns { success: true, teams: [...] }
        setTeams(teamsData.teams || []);
      } else {
        throw new Error('Failed to fetch teams');
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        // API returns { success: true, requestedTeamIds: [...] }
        const requestedTeamIds = new Set<string>(requestsData.requestedTeamIds || []);
        setRequestedTeams(requestedTeamIds);
      }
    } catch (error) {
      setError('Failed to load team discovery data. Please try again later.');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle join request
  const handleJoinRequest = async (teamId: string) => {
    if (!session?.user?.email) {
      setError('You must be signed in to request to join a team.');
      return;
    }

    if (requestedTeams.has(teamId)) {
      return; // Already requested
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
        setRequestedTeams(prev => new Set([...prev, teamId]));
        setError('');
      } else {
        setError(data.error || 'Failed to send join request');
      }
    } catch (error) {
      setError('Failed to send join request. Please try again.');
      console.error('Error sending join request:', error);
    }
  };

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    // Ensure teams is always an array
    const teamsArray = Array.isArray(teams) ? teams : [];
    
    if (!searchQuery.trim()) return teamsArray;

    return teamsArray.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (team.skillsNeeded && team.skillsNeeded.some(skill => 
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );
  }, [teams, searchQuery]);

  // Check team status effect
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

    if (status === "authenticated") {
      checkTeamStatus();
    } else if (status === "unauthenticated") {
      setCheckingTeamStatus(false);
    }
  }, [session?.user?.email, status]);

  // Fetch data effect  
  useEffect(() => {
    if (session?.user?.email && !userHasTeam && !checkingTeamStatus) {
      fetchData();
    }
  }, [session?.user?.email, userHasTeam, checkingTeamStatus]);

  // Authentication guard
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access the team discovery page and find your perfect teammates.
          </p>
          <button
            onClick={() => signIn('google')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Sign In with Google
          </button>
          <Link href="/" className="block mt-4 text-sm text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Show loading while checking team status
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

  // Show message if user already has a team
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <Link href="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                  <Image
                    src="/logo.png"
                    alt="SIH 2025 Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-lg sm:text-xl font-semibold text-gray-900 hidden sm:block">SIH 2025</span>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Team Discovery</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Find teams to join or teammates to collaborate with</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Link 
                href="/"
                className="text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">← Back to Registration</span>
                <span className="sm:hidden">← Back</span>
              </Link>
              {session?.user?.email && (
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32 lg:max-w-none">{session.user.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-32 lg:max-w-none">{session.user.email}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Search and Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:space-y-6">
            {/* Search Bar */}
            <div className="w-full">
              <div className="relative max-w-md mx-auto sm:mx-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search teams by name, skills needed..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Header Section */}
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Available Teams ({filteredTeams.length})</h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Find and join teams looking for members</p>
            </div>
          </div>
        </div>

        {/* Error display */}
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

        {/* Content */}
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredTeams.map((team) => {
            // Use the memberCount and availableSpots from the API response
            const memberCount = team.memberCount || team.memberUserIds?.length || 0;
            const spotsAvailable = team.availableSpots !== undefined ? team.availableSpots : (6 - memberCount);
            
            return (
              <div key={team._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">{team.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                      spotsAvailable > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {spotsAvailable > 0 ? `${spotsAvailable} spots` : 'Full'}
                    </span>
                  </div>
                  
                  {team.description && (
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">{team.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-3 sm:mb-4">
                    <div className="flex items-center text-xs sm:text-sm text-gray-500">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">Leader: {team.leaderUserId}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-500">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {memberCount}/6 members
                    </div>
                  </div>

                  {team.skillsNeeded && team.skillsNeeded.length > 0 && (
                    <div className="mb-3 sm:mb-4">
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
                    className={`w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors duration-200 ${
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

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 616 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No teams found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms or check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
}
