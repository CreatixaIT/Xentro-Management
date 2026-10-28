'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Check, X, Calendar, Clock } from 'lucide-react';

interface LeaveRequest {
  id: string;
  profile_id: string;
  employee_name: string;
  employee_username: string;
  employee_profile_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  admin_remarks: string;
  reviewed_at: string;
  created_at: string;
}

interface AdminLeaveRequestsClientProps {
  profile: {
    full_name: string;
    username: string;
    designation: string;
    id: string;
    avatar_path?: string;
  };
}

export default function AdminLeaveRequestsClient({ profile }: AdminLeaveRequestsClientProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'processed'>('pending');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/admin/leave-requests?filter=${filter}`);
      if (response.status === 404) {
        setTableExists(false);
        setRequests([]);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      const data = await response.json();
      // API returns { requests }, extract the requests array
      setRequests(data.requests || []);
    } catch (err) {
      setError('Failed to load leave requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/leave-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', remarks: remarks[id] || '' }),
      });
      if (!response.ok) throw new Error('Failed to approve request');
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/admin/leave-requests/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', remarks: remarks[id] || '' }),
      });
      if (!response.ok) throw new Error('Failed to reject request');
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-5 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Leave Requests</h1>

        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-3 md:p-4 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="relative flex gap-2">
            {(['pending', 'processed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 md:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-xs md:text-sm"
                style={{
                  backgroundColor: filter === f ? 'rgba(139, 92, 246, 0.20)' : 'rgba(255, 255, 255, 0.05)',
                  color: filter === f ? '#F4F7FF' : '#B4BED1',
                  border: filter === f ? '1px solid rgba(139, 92, 246, 0.30)' : '1px solid transparent'
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          {requests.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <span className="text-3xl md:text-4xl">📅</span>
              <p className="mt-3 md:mt-4 text-xs md:text-sm" style={{ color: '#8995AD' }}>No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.10)', backgroundColor: 'rgba(29, 38, 60, 0.5)' }}>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Employee</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Date Range</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Reason</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Status</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Submitted</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div>
                          <p className="font-medium text-xs md:text-sm" style={{ color: '#F4F7FF' }}>{request.employee_name}</p>
                          {request.employee_username && <p className="text-xs md:text-sm" style={{ color: '#B4BED1' }}>@{request.employee_username}</p>}
                          <p className="text-xs" style={{ color: '#8995AD' }}>ID: {request.employee_profile_id}</p>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm" style={{ color: '#B4BED1' }}>{request.start_date} to {request.end_date}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm max-w-xs truncate" style={{ color: '#B4BED1' }}>{request.reason}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                          backgroundColor: request.status === 'PENDING' ? 'rgba(245, 158, 11, 0.20)' :
                                         request.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.20)' :
                                         request.status === 'REJECTED' ? 'rgba(100, 116, 139, 0.20)' : 'rgba(255, 255, 255, 0.10)',
                          color: request.status === 'PENDING' ? '#F59E0B' : request.status === 'APPROVED' ? '#10B981' : request.status === 'REJECTED' ? '#64748B' : '#B4BED1'
                        }}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm" style={{ color: '#B4BED1' }}>{new Date(request.created_at).toLocaleDateString()}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        {request.status === 'PENDING' ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Remarks (optional)"
                              value={remarks[request.id] || ''}
                              onChange={(e) => setRemarks(prev => ({ ...prev, [request.id]: e.target.value }))}
                              className="w-full px-2 py-1 rounded-xl text-sm resize-none transition-colors"
                              style={{ backgroundColor: 'rgba(20, 27, 45, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F4F7FF' }}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(request.id)} disabled={processing === request.id} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm disabled:opacity-50 transition-colors" style={{ backgroundColor: 'rgba(16, 185, 129, 0.20)', color: '#10B981' }}>
                                {processing === request.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button onClick={() => handleReject(request.id)} disabled={processing === request.id} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm disabled:opacity-50 transition-colors" style={{ backgroundColor: 'rgba(100, 116, 139, 0.20)', color: '#64748B' }}>
                                {processing === request.id ? 'Processing...' : 'Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs md:text-sm" style={{ color: '#B4BED1' }}>
                            {request.admin_remarks && <p className="mb-1">Remarks: {request.admin_remarks}</p>}
                            {request.reviewed_at && <p>Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
