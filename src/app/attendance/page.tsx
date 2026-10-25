'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface AttendanceSession {
  id: string;
  profile_id: string;
  sign_in_time: string;
  sign_out_time: string | null;
  business_date: string;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface LeaveRequest {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type Period = 'date' | 'week' | 'month' | 'year';

export default function AttendancePage() {
  const [period, setPeriod] = useState<Period>('date');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');

  // Leave state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  // Fetch attendance sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const { startDate, endDate } = getDateRange(period, selectedDate);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/attendance/sessions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions');
      }

      setSessions(data.sessions || []);
      setCurrentSession(data.currentSession || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch('/api/leave-requests');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leave requests');
      }

      setLeaveRequests(data.requests || []);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  // Sign In
  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      setError('');

      const response = await fetch('/api/attendance/sign-in', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigningIn(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      setError('');

      const response = await fetch('/api/attendance/sign-out', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign out');
      }

      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSigningOut(false);
    }
  };

  // Submit leave request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingLeave(true);
      setLeaveError('');

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit leave request');
      }

      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      await fetchLeaveRequests();
    } catch (err: any) {
      setLeaveError(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Get date range based on period
  const getDateRange = (period: Period, date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (period) {
      case 'date':
        return {
          startDate: formatDate(date),
          endDate: formatDate(date),
        };
      case 'week': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(day - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          startDate: formatDate(startOfWeek),
          endDate: formatDate(endOfWeek),
        };
      }
      case 'month':
        return {
          startDate: formatDate(new Date(year, month, 1)),
          endDate: formatDate(new Date(year, month + 1, 0)),
        };
      case 'year':
        return {
          startDate: formatDate(new Date(year, 0, 1)),
          endDate: formatDate(new Date(year, 11, 31)),
        };
    }
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Format time to HH:MM
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    });
  };

  // Format duration
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Calculate total duration for displayed sessions
  const getTotalDuration = () => {
    const completedSessions = sessions.filter(s => s.sign_out_time);
    const totalMinutes = completedSessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );
    return formatDuration(totalMinutes);
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    switch (period) {
      case 'date':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    setSelectedDate(newDate);
  };

  // Get period label
  const getPeriodLabel = () => {
    switch (period) {
      case 'date':
        return selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'week': {
        const { startDate, endDate } = getDateRange(period, selectedDate);
        return `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
        return selectedDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      case 'year':
        return selectedDate.getFullYear().toString();
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchLeaveRequests();
  }, [period, selectedDate]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your working hours and leave requests</p>
        </div>

        {/* Period Selector */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(['date', 'week', 'month', 'year'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                ←
              </button>
              <span className="font-medium text-gray-900 min-w-[200px] text-center">
                {getPeriodLabel()}
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                →
              </button>
              <input
                type="date"
                value={formatDate(selectedDate)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Sign In/Sign Out Controls */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentSession ? 'Currently Signed In' : 'Not Signed In'}
              </h2>
              {currentSession && (
                <p className="text-sm text-gray-600">
                  Since {formatTime(currentSession.sign_in_time)}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSignIn}
                disabled={!!currentSession || signingIn || signingOut}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  currentSession || signingIn || signingOut
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {signingIn ? 'Signing In...' : 'Sign In'}
              </button>
              <button
                onClick={handleSignOut}
                disabled={!currentSession || signingIn || signingOut}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !currentSession || signingIn || signingOut
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {sessions.filter(s => s.sign_out_time).length}
              </p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{getTotalDuration()}</p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Days with Attendance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Set(sessions.map(s => s.business_date)).size}
              </p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {currentSession ? 'Signed In' : 'Signed Out'}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance History</h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📋</span>
              <p className="text-gray-600 mt-4">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sign In</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sign Out</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(session.business_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatTime(session.sign_in_time)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.sign_out_time ? formatTime(session.sign_out_time) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDuration(session.duration_minutes)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.sign_out_time
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {session.sign_out_time ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leave Application */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Application</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leave</label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                placeholder="Enter reason for leave..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">{leaveForm.reason.length}/1000 characters</p>
            </div>
            {leaveError && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
                {leaveError}
              </div>
            )}
            <button
              type="submit"
              disabled={submittingLeave}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submittingLeave ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </form>
        </div>

        {/* Leave Request History */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Request History</h2>
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📝</span>
              <p className="text-gray-600 mt-4">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">End Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(request.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(request.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          request.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
