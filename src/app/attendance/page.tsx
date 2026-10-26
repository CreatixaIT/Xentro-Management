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
  admin_remarks?: string;
  reviewed_at?: string;
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
  const [successMessage, setSuccessMessage] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Leave state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFilterMonth, setLeaveFilterMonth] = useState(new Date());

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Dhaka',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
      const params = new URLSearchParams();
      const filterYear = leaveFilterMonth.getFullYear();
      const filterMonth = leaveFilterMonth.getMonth() + 1;
      params.append('year', filterYear.toString());
      params.append('month', filterMonth.toString());

      const response = await fetch(`/api/leave-requests?${params.toString()}`);
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
      setSuccessMessage('');

      const response = await fetch('/api/attendance/sign-in', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      const signInTime = data.attendance?.time_in
        ? new Date(data.attendance.time_in).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Dhaka',
          })
        : '';

      setSuccessMessage(`Signed in successfully at ${signInTime}`);
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
      // Refresh state on error to ensure buttons are not stuck
      await fetchSessions();
    } finally {
      setSigningIn(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      setError('');
      setSuccessMessage('');

      const response = await fetch('/api/attendance/sign-out', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign out');
      }

      const signOutTime = data.attendance?.time_out
        ? new Date(data.attendance.time_out).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Dhaka',
          })
        : '';
      const duration = data.attendance?.work_duration_minutes
        ? formatDuration(data.attendance.work_duration_minutes)
        : '';

      setSuccessMessage(`Signed out successfully at ${signOutTime}. Total duration: ${duration}`);
      await fetchSessions();
    } catch (err: any) {
      setError(err.message);
      // Refresh state on error to ensure buttons are not stuck
      await fetchSessions();
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
      setShowLeaveModal(false);
      await fetchLeaveRequests();
      setSuccessMessage('Leave request submitted successfully');
    } catch (err: any) {
      setLeaveError(err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Convert date to Asia/Dhaka timezone and format as YYYY-MM-DD
  const toDhakaDate = (date: Date): Date => {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  };

  // Format date to YYYY-MM-DD in Asia/Dhaka timezone
  const formatDate = (date: Date): string => {
    const dhakaDate = toDhakaDate(date);
    const year = dhakaDate.getFullYear();
    const month = String(dhakaDate.getMonth() + 1).padStart(2, '0');
    const day = String(dhakaDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse YYYY-MM-DD string to Date object in Asia/Dhaka timezone
  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return toDhakaDate(date);
  };

  // Get date range based on period (using Asia/Dhaka timezone)
  const getDateRange = (period: Period, date: Date) => {
    const dhakaDate = toDhakaDate(date);
    const year = dhakaDate.getFullYear();
    const month = dhakaDate.getMonth();
    const day = dhakaDate.getDate();

    switch (period) {
      case 'date':
        return {
          startDate: formatDate(dhakaDate),
          endDate: formatDate(dhakaDate),
        };
      case 'week': {
        const startOfWeek = new Date(dhakaDate);
        startOfWeek.setDate(day - dhakaDate.getDay());
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

  // Check if selected date is today
  const isToday = (): boolean => {
    const todayDhaka = toDhakaDate(new Date());
    const selectedDhaka = toDhakaDate(selectedDate);
    return (
      todayDhaka.getFullYear() === selectedDhaka.getFullYear() &&
      todayDhaka.getMonth() === selectedDhaka.getMonth() &&
      todayDhaka.getDate() === selectedDhaka.getDate()
    );
  };

  // Check if attendance is completed for selected date
  const isAttendanceCompleted = (): boolean => {
    if (isToday()) {
      // For today, use currentSession (source of truth from server)
      return !!(currentSession && currentSession.sign_out_time);
    }
    // For other dates, check sessions array
    const selectedBusinessDate = formatDate(selectedDate);
    const todaysAttendance = sessions.find(s => s.business_date === selectedBusinessDate);
    return !!(todaysAttendance && todaysAttendance.sign_out_time);
  };

  // Check if signed in for selected date
  const isSignedIn = (): boolean => {
    if (isToday()) {
      // For today, use currentSession (source of truth from server)
      return !!(currentSession && currentSession.sign_in_time && !currentSession.sign_out_time);
    }
    // For other dates, check sessions array
    const selectedBusinessDate = formatDate(selectedDate);
    const todaysAttendance = sessions.find(s => s.business_date === selectedBusinessDate);
    return !!(todaysAttendance && todaysAttendance.sign_in_time && !todaysAttendance.sign_out_time);
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

  // Calculate summary statistics based on period
  const getSummaryStats = () => {
    const completedSessions = sessions.filter(s => s.sign_out_time);
    const distinctDaysWorked = new Set(sessions.map(s => s.business_date)).size;
    const totalDuration = completedSessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );

    // Calculate approved leave days in the period (only APPROVED status)
    const approvedLeaveDays = new Set<string>();
    leaveRequests
      .filter(lr => lr.status === 'APPROVED')
      .forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          approvedLeaveDays.add(dateStr);
          current.setDate(current.getDate() + 1);
        }
      });

    // Calculate pending leave days in the period (for separate display if needed)
    const pendingLeaveDays = new Set<string>();
    leaveRequests
      .filter(lr => lr.status === 'PENDING')
      .forEach(lr => {
        const start = new Date(lr.start_date);
        const end = new Date(lr.end_date);
        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          pendingLeaveDays.add(dateStr);
          current.setDate(current.getDate() + 1);
        }
      });

    // Calculate eligible working days (excluding future dates)
    const today = new Date();
    const todayStr = formatDate(today);
    const eligibleSessions = sessions.filter(s => s.business_date <= todayStr);
    const eligibleDays = new Set(eligibleSessions.map(s => s.business_date)).size;

    // Get total calendar days in the period for graph calculation
    // Note: This is calendar days, not scheduled working days, as no working calendar data exists
    const { startDate, endDate } = getDateRange(period, selectedDate);
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const totalPeriodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // For Date mode, also track single-day details
    let signInTime = null;
    let signOutTime = null;
    let status = null;

    if (period === 'date') {
      const selectedBusinessDate = formatDate(selectedDate);
      const todaysAttendance = sessions.find(s => s.business_date === selectedBusinessDate);
      signInTime = todaysAttendance?.sign_in_time ? formatTime(todaysAttendance.sign_in_time) : '—';
      signOutTime = todaysAttendance?.sign_out_time ? formatTime(todaysAttendance.sign_out_time) : '—';
      status = todaysAttendance?.sign_in_time ? (todaysAttendance.sign_out_time ? 'Completed' : 'In Progress') : 'Absent';
    }

    return {
      daysWorked: distinctDaysWorked,
      totalDuration: formatDuration(totalDuration),
      approvedLeaveDays: approvedLeaveDays.size,
      pendingLeaveDays: pendingLeaveDays.size,
      eligibleAbsentDays: Math.max(0, eligibleDays - distinctDaysWorked - approvedLeaveDays.size),
      totalPeriodDays,
      status,
      signInTime,
      signOutTime,
    };
  };

  // Get current attendance status
  const getCurrentStatus = () => {
    if (!isToday()) return 'Viewing History';
    if (isAttendanceCompleted()) return 'Completed for today';
    if (isSignedIn()) return 'Signed In';
    return 'Not Signed In';
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
    const dhakaDate = toDhakaDate(selectedDate);
    switch (period) {
      case 'date':
        return dhakaDate.toLocaleDateString('en-US', {
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
        return dhakaDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      case 'year':
        return dhakaDate.getFullYear().toString();
    }
  };

  // Get today's attendance for display
  const getTodayAttendance = () => {
    const todayBusinessDate = formatDate(new Date());
    return sessions.find(s => s.business_date === todayBusinessDate) || currentSession;
  };

  useEffect(() => {
    fetchSessions();
  }, [period, selectedDate]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [leaveFilterMonth]);

  const stats = getSummaryStats();

  return (
    <AppLayout>
      <div className="min-h-screen space-y-6 pb-20 md:pb-0">
        {/* Header with Live Clock */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
              <p className="text-gray-600 mt-1">Track your working hours and leave requests</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'monospace' }}>
                {currentTime}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'Asia/Dhaka',
                })}
              </div>
            </div>
          </div>
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
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-700"
              >
                ←
              </button>
              <span className="font-medium text-gray-900 min-w-[200px] text-center">
                {getPeriodLabel()}
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-700"
              >
                →
              </button>
              <input
                type="date"
                value={formatDate(selectedDate)}
                onChange={(e) => setSelectedDate(parseDate(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Summary Panel with Chart and Statistics */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Attendance Breakdown Chart */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Attendance Breakdown ({period.charAt(0).toUpperCase() + period.slice(1)})
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* CSS Pie Chart */}
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    {/* Worked (Green) */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeDasharray={`${(stats.daysWorked / Math.max(stats.totalPeriodDays, 1)) * 100}, 100`}
                    />
                    {/* Approved Leave (Blue) */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray={`${(stats.approvedLeaveDays / Math.max(stats.totalPeriodDays, 1)) * 100}, 100`}
                      strokeDashoffset={`-${(stats.daysWorked / Math.max(stats.totalPeriodDays, 1)) * 100}`}
                    />
                    {/* Pending Leave (Yellow) - shown conditionally */}
                    {stats.pendingLeaveDays > 0 && (
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="3"
                        strokeDasharray={`${(stats.pendingLeaveDays / Math.max(stats.totalPeriodDays, 1)) * 100}, 100`}
                        strokeDashoffset={`-${((stats.daysWorked + stats.approvedLeaveDays) / Math.max(stats.totalPeriodDays, 1)) * 100}`}
                      />
                    )}
                    {/* Absent (Red) */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray={`${(stats.eligibleAbsentDays / Math.max(stats.totalPeriodDays, 1)) * 100}, 100`}
                      strokeDashoffset={`-${((stats.daysWorked + stats.approvedLeaveDays + (stats.pendingLeaveDays || 0)) / Math.max(stats.totalPeriodDays, 1)) * 100}`}
                    />
                  </svg>
                </div>
                {/* Legend */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">Days Worked: {stats.daysWorked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">Approved Leave: {stats.approvedLeaveDays}</span>
                  </div>
                  {stats.pendingLeaveDays > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-gray-700">Pending Leave: {stats.pendingLeaveDays}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm text-gray-700">Absent Days: {stats.eligibleAbsentDays}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Summary Statistics */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {period.charAt(0).toUpperCase() + period.slice(1)} Summary
                </h3>
              </div>

              {/* Statistics */}
              <div className="space-y-3">
                {/* Period-level statistics */}
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Calendar Days</span>
                  <span className="font-medium text-gray-900">{stats.totalPeriodDays}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Days Worked</span>
                  <span className="font-medium text-gray-900">{stats.daysWorked}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Approved Leave Days</span>
                  <span className="font-medium text-gray-900">{stats.approvedLeaveDays}</span>
                </div>
                {stats.pendingLeaveDays > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Pending Leave Days</span>
                    <span className="font-medium text-gray-900">{stats.pendingLeaveDays}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Absent Days</span>
                  <span className="font-medium text-gray-900">{stats.eligibleAbsentDays}</span>
                </div>
                {period !== 'date' && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Duration</span>
                    <span className="font-medium text-gray-900">{stats.totalDuration}</span>
                  </div>
                )}

                {/* Date-specific details */}
                {period === 'date' && (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium text-gray-900">{stats.status}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Sign In</span>
                      <span className="font-medium text-gray-900">{stats.signInTime}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Sign Out</span>
                      <span className="font-medium text-gray-900">{stats.signOutTime}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium text-gray-900">{stats.totalDuration}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sign In/Sign Out Buttons */}
          {isToday() && (
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleSignIn}
                disabled={signingIn || signingOut || isSignedIn() || isAttendanceCompleted()}
                className={`px-14 py-5 rounded-lg font-bold text-xl transition-colors ${
                  signingIn || signingOut || isSignedIn() || isAttendanceCompleted()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {signingIn ? 'Signing In...' : 'Sign In'}
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingIn || signingOut || !isSignedIn()}
                className={`px-14 py-5 rounded-lg font-bold text-xl transition-colors ${
                  signingIn || signingOut || !isSignedIn()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
                }`}
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mt-4 bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-lg">
              {successMessage}
            </div>
          )}
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
                        {session.business_date}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.sign_in_time ? formatTime(session.sign_in_time) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.sign_out_time ? formatTime(session.sign_out_time) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {session.sign_out_time ? formatDuration(session.duration_minutes) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !session.sign_in_time
                            ? 'bg-red-100 text-red-700'
                          : session.sign_out_time
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {!session.sign_in_time ? 'Absent' : session.sign_out_time ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leave Requests */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
              <p className="text-sm text-gray-600 mt-1">Apply for leave or view your request history</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
            >
              Apply for Leave
            </button>
          </div>

          {/* Month Filter and History */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <input
              type="month"
              value={`${leaveFilterMonth.getFullYear()}-${String(leaveFilterMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                setLeaveFilterMonth(new Date(year, month - 1, 1));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 md:w-auto"
            />
          </div>

          {leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📅</span>
              <p className="text-gray-600 mt-4">No leave requests found for this month</p>
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
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{request.start_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{request.end_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{request.reason}</td>
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

        {/* Leave Modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Apply for Leave</h3>
                <button
                  onClick={() => {
                    if (!submittingLeave) {
                      setShowLeaveModal(false);
                      setLeaveForm({ startDate: '', endDate: '', reason: '' });
                      setLeaveError('');
                    }
                  }}
                  disabled={submittingLeave}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmitLeave} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 resize-none"
                    rows={3}
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {leaveForm.reason.length}/1000 characters
                  </p>
                </div>
                {leaveError && (
                  <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
                    {leaveError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!submittingLeave) {
                        setShowLeaveModal(false);
                        setLeaveForm({ startDate: '', endDate: '', reason: '' });
                        setLeaveError('');
                      }
                    }}
                    disabled={submittingLeave}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {submittingLeave ? 'Submitting...' : 'Apply for Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
