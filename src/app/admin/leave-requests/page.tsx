'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function AdminLeaveRequests() {
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
      // Don't show error if table doesn't exist yet
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/xentro-logo.png" alt="Xentro Logo" className="h-10 w-auto" />
            <h1 className="text-xl font-bold">Leave Requests</h1>
          </div>
          <Link
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!tableExists && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6">
            Leave requests table not found. Please apply migration 017 to enable this feature.
          </div>
        )}
        {error && tableExists && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            {(['pending', 'processed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📅</span>
              <p className="text-gray-400 mt-4">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date Range</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{request.employee_name}</p>
                          {request.employee_username && (
                            <p className="text-sm text-gray-400">@{request.employee_username}</p>
                          )}
                          <p className="text-xs text-gray-500">ID: {request.employee_profile_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {request.start_date} to {request.end_date}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'PENDING' ? 'bg-yellow-900/50 text-yellow-300' :
                          request.status === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                          request.status === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'PENDING' ? (
                          <div className="space-y-2">
                            <textarea
                              placeholder="Remarks (optional)"
                              value={remarks[request.id] || ''}
                              onChange={(e) => setRemarks(prev => ({ ...prev, [request.id]: e.target.value }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={processing === request.id}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                              >
                                {processing === request.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={processing === request.id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
                              >
                                {processing === request.id ? 'Processing...' : 'Reject'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
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
      </main>
    </div>
  );
}
