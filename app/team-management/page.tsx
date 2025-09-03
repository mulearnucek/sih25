"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface JoinRequest {
  _id: string;
  teamId: string;
  teamName: string;
  userEmail: string;
  userName: string;
  userDetails: {
    department?: string;
    year?: string;
    phone?: string;
    skills?: string[];
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Team {
  _id: string;
  name: string;
  inviteCode: string;
  leaderUserId: string;
  memberUserIds: string[];
  description?: string;
  skillsNeeded?: string[];
  problemStatement?: string;
}

export default function TeamManagementPage() {
  const { data: session, status } = useSession();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      fetchTeamData();
      fetchJoinRequests();
    }
  }, [status, session]);

  const fetchTeamData = async () => {
    try {
      const response = await fetch('/api/team/status');
      if (response.ok) {
        const data = await response.json();
        if (data.team) {
          setUserTeam(data.team);
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const response = await fetch('/api/team/join-requests');
      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingRequest(requestId);
    try {
      const response = await fetch('/api/team/manage-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        // Refresh the requests and team data
        await Promise.all([fetchJoinRequests(), fetchTeamData()]);
      } else {
        alert(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('An error occurred while processing the request');
    } finally {
      setProcessingRequest(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your team management...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to manage your team.</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  if (!userTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Found</h1>
          <p className="text-gray-600 mb-6">You are not currently leading a team.</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
              <p className="mt-2 text-gray-600">Manage your team and join requests</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Registration
            </Link>
          </div>
        </div>

        {/* Team Info */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Team: {userTeam.name}</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Team Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{userTeam.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Invite Code</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                  {userTeam.inviteCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Members</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {userTeam.memberUserIds?.length || 0}/6 members
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Join Requests */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Join Requests ({joinRequests.length})
            </h2>
          </div>
          <div className="px-6 py-4">
            {joinRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Join Requests</h3>
                <p className="text-gray-600">
                  You don't have any pending join requests at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <div
                    key={request._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.userName}
                          </h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{request.userEmail}</p>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {request.userDetails.department && (
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Department</dt>
                              <dd className="text-sm text-gray-900">{request.userDetails.department}</dd>
                            </div>
                          )}
                          {request.userDetails.year && (
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Year</dt>
                              <dd className="text-sm text-gray-900">{request.userDetails.year}</dd>
                            </div>
                          )}
                          {request.userDetails.phone && (
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Phone</dt>
                              <dd className="text-sm text-gray-900">{request.userDetails.phone}</dd>
                            </div>
                          )}
                          {request.userDetails.skills && request.userDetails.skills.length > 0 && (
                            <div>
                              <dt className="text-xs font-medium text-gray-500">Skills</dt>
                              <dd className="text-sm text-gray-900">
                                {request.userDetails.skills.join(', ')}
                              </dd>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-3">
                          Requested on {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleRequest(request._id, 'accept')}
                          disabled={processingRequest === request._id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingRequest === request._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Accept'
                          )}
                        </button>
                        <button
                          onClick={() => handleRequest(request._id, 'reject')}
                          disabled={processingRequest === request._id}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingRequest === request._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                          ) : (
                            'Reject'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
