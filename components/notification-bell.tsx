"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const { data: session } = useSession();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetchJoinRequests();
      // Set up polling every 30 seconds
      const interval = setInterval(fetchJoinRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.email]);

  const fetchJoinRequests = async () => {
    try {
      setLoading(true);
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
        // Remove the processed request from the list
        setJoinRequests(prev => prev.filter(req => req._id !== requestId));
        
        // Show appropriate message based on the response
        if (data.userAlreadyInTeam) {
          alert(`${data.message}`);
        } else {
          alert(data.message);
        }
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

  const pendingCount = joinRequests.length;

  if (!session?.user?.email || pendingCount === 0) {
    return null; // Don't show if no user or no requests
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
      >
        <div className="text-xl">🔔</div>
        {/* Notification badge */}
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Join Requests ({pendingCount})
              </h3>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading requests...</p>
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-gray-600">No pending requests</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {joinRequests.map((request) => (
                    <div key={request._id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h4 className="text-sm font-medium text-gray-900">
                              {request.userName}
                            </h4>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {request.teamName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{request.userEmail}</p>
                          
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            {request.userDetails.department && (
                              <div>
                                <span className="text-gray-500">Dept:</span> {request.userDetails.department}
                              </div>
                            )}
                            {request.userDetails.year && (
                              <div>
                                <span className="text-gray-500">Year:</span> {request.userDetails.year}
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleRequest(request._id, 'accept')}
                          disabled={processingRequest === request._id}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingRequest === request._id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            'Accept'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequest(request._id, 'reject')}
                          disabled={processingRequest === request._id}
                          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingRequest === request._id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></div>
                          ) : (
                            'Reject'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
