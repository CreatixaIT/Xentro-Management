'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChevronLeft, ChevronRight, Download, Search, Calendar, Clock, User, CalendarDays, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Employee {
  id: string;
  username: string;
  full_name: string;
  designation: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  business_date: string;
  time_in: string | null;
  time_out: string | null;
  work_duration_minutes: number | null;
  status: string;
  notes: string | null;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
}

interface Summary {
  presentDays: number;
  approvedLeaveDays: number;
  pendingLeaveDays: number;
  absentDays: number;
  totalHours: number;
  avgHoursPerPresentDay: number;
  totalBusinessDays: number;
}

type Period = 'day' | 'week' | 'month' | 'year';

const COLORS = {
  present: '#10B981',
  approvedLeave: '#8B5CF6',
  pendingLeave: '#F59E0B',
  absent: '#EF4444',
};

export default function AdminAttendanceClient({ profile }: { profile: any }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch attendance data when employee or period changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchAttendanceReport();
    }
  }, [selectedEmployee, period, selectedDate]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/attendance/employees');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch employees');
      }

      setEmployees(data.employees || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchAttendanceReport = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.append('employeeId', selectedEmployee.id);
      params.append('period', period);
      params.append('date', selectedDate.toISOString());

      const response = await fetch(`/api/admin/attendance/report?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance report');
      }

      setAttendance(data.attendance || []);
      setLeaveRequests(data.leaveRequests || []);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.username.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.designation.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);

    switch (period) {
      case 'day':
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getDayStatus = (date: string) => {
    // Check attendance
    const attendanceRecord = attendance.find(a => a.business_date === date);
    if (attendanceRecord && (attendanceRecord.status === 'PRESENT' || attendanceRecord.status === 'LATE' || attendanceRecord.status === 'HALF_DAY')) {
      return 'present';
    }

    // Check approved leave
    for (const leave of leaveRequests) {
      if (leave.status === 'APPROVED') {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const current = new Date(date);
        if (current >= start && current <= end) {
          return 'approvedLeave';
        }
      }
    }

    // Check pending leave
    for (const leave of leaveRequests) {
      if (leave.status === 'PENDING') {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const current = new Date(date);
        if (current >= start && current <= end) {
          return 'pendingLeave';
        }
      }
    }

    // Check if it's a weekend (Friday or Saturday in Bangladesh)
    const dateObj = new Date(date);
    const day = dateObj.getDay();
    if (day === 5 || day === 6) {
      return 'weekend';
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj > today) {
      return 'future';
    }

    return 'absent';
  };

  const getDayColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500/30 text-green-300';
      case 'approvedLeave': return 'bg-purple-500/30 text-purple-300';
      case 'pendingLeave': return 'bg-yellow-500/30 text-yellow-300';
      case 'absent': return 'bg-red-500/30 text-red-300';
      case 'weekend': return 'bg-gray-600/30 text-gray-400';
      case 'future': return 'bg-gray-700/30 text-gray-500';
      default: return 'bg-gray-600/30 text-gray-400';
    }
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDay = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    const totalDays = lastDay.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, isEmpty: true });
    }
    
    // Add actual days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      days.push({ date: dateStr, isEmpty: false });
    }
    
    return days;
  };

  const handleCalendarMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCalendarMonth(newMonth);
  };

  const handleDateSelect = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
  };

  const generatePDF = () => {
    if (!selectedEmployee || !summary) return;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('Xentro Management - Attendance Report', 14, 15);

    // Generation timestamp in Asia/Dhaka
    const generationDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const generationTime = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Employee info
    doc.setFontSize(12);
    doc.text(`Employee: ${selectedEmployee.full_name} (@${selectedEmployee.username})`, 14, 25);
    doc.text(`Designation: ${selectedEmployee.designation}`, 14, 32);
    doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)} - ${formatDate(selectedDate)}`, 14, 39);
    doc.text(`Generated: ${generationDate} at ${generationTime} (Asia/Dhaka)`, 14, 46);

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, 58);

    doc.setFontSize(10);
    doc.text(`Present Days: ${summary.presentDays}`, 14, 66);
    doc.text(`Approved Leave Days: ${summary.approvedLeaveDays}`, 14, 73);
    doc.text(`Pending Leave Days: ${summary.pendingLeaveDays}`, 14, 80);
    doc.text(`Absent Days: ${summary.absentDays}`, 14, 87);
    doc.text(`Total Working Hours: ${summary.totalHours.toFixed(2)}h`, 14, 94);
    doc.text(`Avg Hours/Day: ${summary.avgHoursPerPresentDay.toFixed(2)}h`, 14, 101);

    // Attendance table
    const tableData = attendance.map(record => [
      record.business_date,
      new Date(record.business_date).toLocaleDateString('en-US', { weekday: 'long' }),
      record.status,
      formatTime(record.time_in),
      formatTime(record.time_out),
      formatDuration(record.work_duration_minutes),
    ]);

    autoTable(doc, {
      head: [['Date', 'Day', 'Status', 'Sign In', 'Sign Out', 'Duration']],
      body: tableData,
      startY: 113,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 27, 45] },
    });

    doc.save(`attendance-report-${selectedEmployee.username}-${period}.pdf`);
  };

  const pieData = summary ? [
    { name: 'Present', value: summary.presentDays, color: COLORS.present },
    { name: 'Approved Leave', value: summary.approvedLeaveDays, color: COLORS.approvedLeave },
    { name: 'Pending Leave', value: summary.pendingLeaveDays, color: COLORS.pendingLeave },
    { name: 'Absent', value: summary.absentDays, color: COLORS.absent },
  ].filter(d => d.value > 0) : [];

  if (loading && !summary) {
    return (
      <div style={{ color: '#F4F7FF', textAlign: 'center', padding: '3rem' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#F4F7FF' }}>
            Attendance & Reports
          </h1>
          <p className="text-sm" style={{ color: '#B4BED1' }}>
            Super Admin • Attendance & Reports
          </p>
        </div>
        <button
          onClick={generatePDF}
          disabled={!summary}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: summary ? '#8B5CF6' : 'rgba(139, 92, 246, 0.3)',
            color: '#F4F7FF',
          }}
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Employee Selector */}
      <div className="relative">
        <label className="block text-sm font-medium mb-2" style={{ color: '#B4BED1' }}>
          Employee Selector
        </label>
        <div className="relative">
          <div
            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
            style={{
              backgroundColor: 'rgba(20, 27, 45, 0.72)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
          >
            <User className="w-5 h-5" style={{ color: '#8995AD' }} />
            <span style={{ color: '#F4F7FF' }}>
              {selectedEmployee ? selectedEmployee.full_name : 'Select an employee'}
            </span>
          </div>

          {showEmployeeDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-2 p-3 rounded-lg z-10"
              style={{
                backgroundColor: 'rgba(20, 27, 45, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8995AD' }} />
                <input
                  type="text"
                  placeholder="Search by employee name or username"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'rgba(8, 11, 20, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#F4F7FF',
                  }}
                />
              </div>

              <div className="space-y-1">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setShowEmployeeDropdown(false);
                      setEmployeeSearch('');
                    }}
                    className="p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                    style={{ color: '#F4F7FF' }}
                  >
                    <div className="font-medium">{emp.full_name}</div>
                    <div className="text-xs" style={{ color: '#8995AD' }}>
                      @{emp.username} • {emp.designation}
                    </div>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-4" style={{ color: '#8995AD' }}>
                    No employees found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Period Selector */}
      {selectedEmployee && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#B4BED1' }}>
            Report Period
          </label>
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: period === p ? '#8B5CF6' : 'rgba(20, 27, 45, 0.72)',
                  color: '#F4F7FF',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', color: '#F4F7FF' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium" style={{ color: '#F4F7FF' }}>
              {formatDate(selectedDate)}
            </span>
            <button
              onClick={() => handleDateChange('next')}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', color: '#F4F7FF' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>
          {error}
        </div>
      )}

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Days Present"
              value={summary.presentDays}
              icon={<Calendar className="w-5 h-5" />}
              color="#10B981"
            />
            <SummaryCard
              title="Total Hours"
              value={`${summary.totalHours.toFixed(1)}h`}
              icon={<Clock className="w-5 h-5" />}
              color="#8B5CF6"
            />
            <SummaryCard
              title="Leave Days"
              value={summary.approvedLeaveDays}
              icon={<CalendarDays className="w-5 h-5" />}
              color="#F59E0B"
            />
            <SummaryCard
              title="Absent Days"
              value={summary.absentDays}
              icon={<User className="w-5 h-5" />}
              color="#EF4444"
            />
          </div>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: '#F4F7FF' }}>
                Attendance Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(20, 27, 45, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F4F7FF',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span style={{ color: '#F4F7FF' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Interactive Calendar */}
          {summary && (
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: '#F4F7FF' }}>
                  Attendance Calendar
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCalendarMonthChange('prev')}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', color: '#F4F7FF' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium" style={{ color: '#F4F7FF' }}>
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handleCalendarMonthChange('next')}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', color: '#F4F7FF' }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium p-2" style={{ color: '#B4BED1' }}>
                    {day}
                  </div>
                ))}
                {getCalendarDays().map((day, index) => {
                  if (day.isEmpty || !day.date) {
                    return <div key={index} className="p-2" />;
                  }
                  const status = getDayStatus(day.date);
                  const isSelected = selectedCalendarDate === day.date;
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(day.date)}
                      className={`p-2 rounded-lg text-sm transition-colors ${
                        isSelected ? 'ring-2 ring-purple-500' : ''
                      } ${getDayColor(status)}`}
                      style={{ color: '#F4F7FF' }}
                    >
                      {new Date(day.date).getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#B4BED1' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }} />
                  <span>Approved Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                  <span>Pending Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6B7280' }} />
                  <span>Weekend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#374151' }} />
                  <span>Future</span>
                </div>
              </div>
            </div>
          )}

          {/* Selected Date Detail Panel */}
          {selectedCalendarDate && summary && (
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: '#F4F7FF' }}>
                  {selectedCalendarDate ? formatDate(new Date(selectedCalendarDate)) : ''}
                </h3>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  className="text-sm"
                  style={{ color: '#8995AD' }}
                >
                  Close
                </button>
              </div>

              {(() => {
                if (!selectedCalendarDate) return null;
                
                const status = getDayStatus(selectedCalendarDate);
                const attendanceRecord = attendance.find(a => a.business_date === selectedCalendarDate);
                const leaveRecord = leaveRequests.find(lr => {
                  const start = new Date(lr.start_date);
                  const end = new Date(lr.end_date);
                  const current = new Date(selectedCalendarDate);
                  return current >= start && current <= end;
                });

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#B4BED1' }}>Status:</span>
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor:
                            status === 'present' ? 'rgba(16, 185, 129, 0.2)' :
                            status === 'approvedLeave' ? 'rgba(139, 92, 246, 0.2)' :
                            status === 'pendingLeave' ? 'rgba(245, 158, 11, 0.2)' :
                            status === 'absent' ? 'rgba(239, 68, 68, 0.2)' :
                            status === 'weekend' ? 'rgba(107, 114, 128, 0.2)' :
                            'rgba(55, 65, 81, 0.2)',
                          color:
                            status === 'present' ? '#10B981' :
                            status === 'approvedLeave' ? '#8B5CF6' :
                            status === 'pendingLeave' ? '#F59E0B' :
                            status === 'absent' ? '#EF4444' :
                            status === 'weekend' ? '#6B7280' :
                            '#9CA3AF',
                        }}
                      >
                        {status === 'present' ? 'Present' :
                         status === 'approvedLeave' ? 'Approved Leave' :
                         status === 'pendingLeave' ? 'Pending Leave' :
                         status === 'absent' ? 'Absent' :
                         status === 'weekend' ? 'Weekend' :
                         'Future'}
                      </span>
                    </div>

                    {attendanceRecord && (
                      <>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#B4BED1' }}>Sign In:</span>
                          <span style={{ color: '#F4F7FF' }}>{formatTime(attendanceRecord.time_in)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#B4BED1' }}>Sign Out:</span>
                          <span style={{ color: '#F4F7FF' }}>{formatTime(attendanceRecord.time_out)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#B4BED1' }}>Duration:</span>
                          <span style={{ color: '#F4F7FF' }}>{formatDuration(attendanceRecord.work_duration_minutes)}</span>
                        </div>
                      </>
                    )}

                    {leaveRecord && (
                      <>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#B4BED1' }}>Leave Type:</span>
                          <span style={{ color: '#F4F7FF' }}>{leaveRecord.status}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#B4BED1' }}>Reason:</span>
                          <span style={{ color: '#F4F7FF' }} className="max-w-xs truncate">{leaveRecord.reason}</span>
                        </div>
                      </>
                    )}

                    {!attendanceRecord && !leaveRecord && status === 'absent' && (
                      <div style={{ color: '#8995AD' }}>
                        No attendance or leave record for this date
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Detailed Attendance Table */}
          <div
            className="p-6 rounded-lg"
            style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#F4F7FF' }}>
              Daily Attendance Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ color: '#B4BED1' }}>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Day</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Sign In</th>
                    <th className="text-left p-3">Sign Out</th>
                    <th className="text-left p-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr
                      key={record.id}
                      style={{ color: '#F4F7FF', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                      <td className="p-3">{record.business_date}</td>
                      <td className="p-3">
                        {new Date(record.business_date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor:
                              record.status === 'PRESENT'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : record.status === 'LATE'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : record.status === 'HALF_DAY'
                                ? 'rgba(139, 92, 246, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            color:
                              record.status === 'PRESENT'
                                ? '#10B981'
                                : record.status === 'LATE'
                                ? '#F59E0B'
                                : record.status === 'HALF_DAY'
                                ? '#8B5CF6'
                                : '#EF4444',
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3">{formatTime(record.time_in)}</td>
                      <td className="p-3">{formatTime(record.time_out)}</td>
                      <td className="p-3">{formatDuration(record.work_duration_minutes)}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center" style={{ color: '#8995AD' }}>
                        No attendance records for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedEmployee && (
        <div className="text-center py-12" style={{ color: '#8995AD' }}>
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select an employee to view their attendance report</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="text-sm" style={{ color: '#B4BED1' }}>
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: '#F4F7FF' }}>
        {value}
      </div>
    </div>
  );
}
