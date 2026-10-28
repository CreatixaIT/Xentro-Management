'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface LeaveRequest {
  id: string;
  profile_id: string;
  employee_name?: string;
  employee_username?: string;
  employee_email?: string;
  employee_profile_id?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  admin_remarks?: string;
  created_at: string;
  reviewed_at?: string;
}

interface AdminLeaveRequestsClientProps {
  profile: {
    id: string;
    full_name: string;
    username: string;
    designation: string;
    role: string;
    status: string;
    avatar_path?: string;
  };
}

export default function AdminLeaveRequestsClient({ profile }: AdminLeaveRequestsClientProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'processed'>('pending');
  const [tableExists, setTableExists] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setTableExists(true);
      const response = await fetch(`/api/admin/leave-requests?filter=${filter}`);
      if (!response.ok) {
        const data = await response.json();
        if (data.error?.includes('not found') || response.status === 404) {
          setTableExists(false);
          setRequests([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch leave requests');
      }
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err: any) {
      if (err.message?.includes('not found')) {
        setTableExists(false);
        setRequests([]);
      } else {
        console.error(err);
        setError(err.message || 'Failed to load leave requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessing(requestId);
      const response = await fetch(`/api/admin/leave-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          remarks: remarks[requestId] || '',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve request');
      }

      await fetchRequests();
      setRemarks(prev => ({ ...prev, [requestId]: '' }));
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessing(requestId);
      const response = await fetch(`/api/admin/leave-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          remarks: remarks[requestId] || '',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      await fetchRequests();
      setRemarks(prev => ({ ...prev, [requestId]: '' }));
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="text-white text-center py-12">Loading...</div>
    );
  }

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-4 md:space-y-6">
        {!tableExists && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-3 md:px-4 py-2 md:py-3 rounded-xl backdrop-blur-xl text-xs md:text-sm">
            Leave requests table not found. Please apply migration 017 to enable this feature.
          </div>
        )}
        {error && tableExists && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 md:px-4 py-2 md:py-3 rounded-xl backdrop-blur-xl text-xs md:text-sm">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-3 md:p-4">
          <div className="flex gap-2">
            {(['pending', 'processed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 md:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-xs md:text-sm ${
                  filter === f
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <span className="text-3xl md:text-4xl">📅</span>
              <p className="text-white/50 mt-3 md:mt-4 text-xs md:text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Employee</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Date Range</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Reason</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Status</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Submitted</th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div>
                          <p className="font-medium text-white text-xs md:text-sm">{request.employee_name}</p>
                          {request.employee_username && (
                            <p className="text-xs md:text-sm text-white/60">@{request.employee_username}</p>
                          )}
                          <p className="text-xs text-white/50">ID: {request.employee_profile_id}</p>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-white/70">
                        {request.start_date} to {request.end_date}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm max-w-xs truncate text-white/70">
                        {request.reason}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'PENDING' ? 'bg-red-500/20 text-red-400' :
                          request.status === 'APPROVED' ? 'bg-yellow-500/20 text-yellow-400' :
                          request.status === 'REJECTED' ? 'bg-black/40 text-white' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-sm text-white/70">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        {request.status === 'PENDING' ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Remarks (optional)"
                              value={remarks[request.id] || ''}
                              onChange={(e) => setRemarks(prev => ({ ...prev, [request.id]: e.target.value }))}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processing === request.id}
                                className="px-2 md:px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs md:text-sm disabled:opacity-50 transition-colors"
                              >
                                {processing === request.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={processing === request.id}
                                className="px-2 md:px-3 py-1 bg-black/40 hover:bg-black/50 text-white rounded text-xs md:text-sm disabled:opacity-50 transition-colors"
                              >
                                {processing === request.id ? 'Processing...' : 'Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs md:text-sm text-white/60">
                            {request.admin_remarks && (
                              <p className="mb-1">Remarks: {request.admin_remarks}</p>
                            )}
                            {request.reviewed_at && (
                              <p>Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</p>
                            )}
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
