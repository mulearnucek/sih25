"use client";
import { useEffect, useState } from "react";
import BroadcastForm from "@/components/broadcast-form";
import AdminLogin from "@/components/admin-login";

// Simple admin credentials - in production, use proper authentication
const ADMIN_CREDENTIALS = {
  email: "admin@example.com",
  password: "admin123"
};

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setLoginError(null);
    } else {
      setLoginError("Invalid email or password");
    }

    setLoginLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
  };

  const fetchData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setError(null);
      setLoading(true);
      const [pRes, tRes] = await Promise.all([
        fetch("/api/dashboard/participants", { 
          cache: "no-store",
          credentials: 'include'
        }),
        fetch("/api/dashboard/teams", { 
          cache: "no-store",
          credentials: 'include'
        }),
      ]);
      
      if (!pRes.ok) {
        const errorData = await pRes.json();
        console.error('Participants API error:', errorData);
        throw new Error(`Failed to fetch participants: ${errorData.error || pRes.statusText}`);
      }
      
      if (!tRes.ok) {
        const errorData = await tRes.json();
        console.error('Teams API error:', errorData);
        throw new Error(`Failed to fetch teams: ${errorData.error || tRes.statusText}`);
      }
      
      const participantsData = await pRes.json();
      const teamsData = await tRes.json();
      
      console.log('Participants data:', participantsData);
      console.log('Teams data:', teamsData);
      
      setParticipants(participantsData.participants || []);
      setTeams(teamsData.teams || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <AdminLogin 
        onLogin={handleLogin}
        error={loginError}
        loading={loginLoading}
      />
    );
  }

  // Calculate statistics
  const stats = {
    totalParticipants: participants.length,
    totalTeams: teams.length,
    completeTeams: teams.filter((t: any) => {
      const memberCount = (t.memberUserIds?.length || 0) + (t.leaderUserId ? 1 : 0);
      return memberCount === 6;
    }).length,
    incompleteTeams: teams.filter((t: any) => {
      const memberCount = (t.memberUserIds?.length || 0) + (t.leaderUserId ? 1 : 0);
      return memberCount > 0 && memberCount < 6;
    }).length,
    emptyTeams: teams.filter((t: any) => {
      const memberCount = (t.memberUserIds?.length || 0) + (t.leaderUserId ? 1 : 0);
      return memberCount === 0;
    }).length,
    participantsInTeams: participants.filter((p: any) => p.teamStatus?.hasTeam).length,
    participantsWithoutTeams: participants.filter((p: any) => !p.teamStatus?.hasTeam).length,
    averageTeamSize: teams.length > 0 ? 
      Math.round(
        teams.reduce((acc: number, t: any) => {
          const memberCount = (t.memberUserIds?.length || 0) + (t.leaderUserId ? 1 : 0);
          return acc + memberCount;
        }, 0) / teams.length * 10
      ) / 10 : 0,
    teamCompletionRate: teams.length > 0 ? 
      Math.round((teams.filter((t: any) => {
        const memberCount = (t.memberUserIds?.length || 0) + (t.leaderUserId ? 1 : 0);
        return memberCount === 6;
      }).length / teams.length) * 100) : 0,
    participantRegistrationRate: participants.length > 0 ? 
      Math.round((participants.filter((p: any) => p.teamStatus?.hasTeam).length / participants.length) * 100) : 0
  };

  console.log('Current stats:', stats);
  console.log('Participants:', participants);
  console.log('Teams:', teams);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border p-8">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="text-gray-700 font-medium">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">SIH 2025 Registration Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">{ADMIN_CREDENTIALS.email}</p>
              </div>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                title="Refresh Data"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <a 
                href="/api/dashboard/export" 
                className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Data
              </a>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                title="Logout"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Registration Statistics</h2>
            <p className="text-sm text-gray-500 mt-1">
              {lastUpdated ? (
                <>Last updated: {lastUpdated.toLocaleString()}</>
              ) : (
                <>Real-time registration data</>
              )}
            </p>
          </div>
          {participants.length === 0 && teams.length === 0 && !loading && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              No registration data found
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complete Teams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completeTeams}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalTeams > 0 ? Math.round((stats.completeTeams / stats.totalTeams) * 100) : 0}% completion
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Participants in Teams</p>
                <p className="text-3xl font-bold text-gray-900">{stats.participantsInTeams}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.participantRegistrationRate}% joined teams
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'participants', name: 'Participants', icon: '👥' },
              { id: 'teams', name: 'Teams', icon: '🏆' },
              { id: 'broadcast', name: 'Broadcast', icon: '📢' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration Status */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white text-sm mr-2">📈</span>
                Registration Status
              </h3>
              <div className="space-y-4">
                {/* Team Completion */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Team Completion</span>
                    <span className="font-semibold">{stats.completeTeams} / {stats.totalTeams}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.teamCompletionRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {stats.teamCompletionRate}% teams completed (6/6 members)
                  </div>
                </div>

                {/* Participant Registration */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Participants in Teams</span>
                    <span className="font-semibold">{stats.participantsInTeams} / {stats.totalParticipants}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.participantRegistrationRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {stats.participantRegistrationRate}% participants joined teams
                  </div>
                </div>

                {/* Team Status Breakdown */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-sm text-gray-600 mb-2">Team Status Breakdown:</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{stats.completeTeams}</div>
                      <div className="text-gray-500">Complete</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">{stats.incompleteTeams}</div>
                      <div className="text-gray-500">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-600">{stats.participantsWithoutTeams}</div>
                      <div className="text-gray-500">No Team</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white text-sm mr-2">⚡</span>
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setActiveTab('broadcast')}
                  className="w-full text-left p-3 rounded border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">📢</span>
                    <span className="text-sm font-medium">Send Broadcast Email</span>
                  </div>
                </button>
                <a 
                  href="/api/dashboard/export"
                  className="block w-full text-left p-3 rounded border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-medium">Export Data</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm mr-3">📢</span>
              Broadcast Email
            </h2>
            <BroadcastForm />
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm mr-3">👥</span>
                Participants ({participants.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((p: any, index: number) => (
                    <tr key={p.email} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.gender || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.fields?.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.fields?.department || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.fields?.year || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {p.teamStatus?.hasTeam ? (
                          <div className="flex flex-col">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              p.teamStatus.role === 'Leader' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {p.teamStatus.role}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">{p.teamStatus.teamName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Not joined yet
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm mr-3">🏆</span>
                Teams ({teams.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invite Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leader</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.map((t: any, index: number) => {
                    const memberCount = t.memberUserIds?.length || 0;
                    const isComplete = memberCount === 6;
                    return (
                      <tr key={t.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="font-mono bg-gray-100 rounded px-2 py-1 inline-block">{t.inviteCode}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{t.leaderUserId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{memberCount}/6</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isComplete ? 'bg-green-600' : 'bg-blue-600'
                                }`}
                                style={{ width: `${(memberCount / 6) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isComplete
                              ? 'bg-green-100 text-green-800'
                              : memberCount > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isComplete ? 'Complete' : memberCount > 0 ? 'In Progress' : 'Empty'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
