'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ResetRequest {
  id: string;
  status: string;
  requested_at: string;
  profiles: {
    username: string;
    full_name: string;
    email: string;
    designation: string;
  };
}

export default function AdminResetRequests() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/reset-requests?status=PENDING');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await fetch('/api/admin/reset-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (response.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-gray-400 hover:text-white">← Back to Dashboard</Link>
          <h1 className="text-xl font-bold">Password Reset Requests</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-t border-gray-700">
                  <td className="px-4 py-3">{req.profiles.username}</td>
                  <td className="px-4 py-3">{req.profiles.full_name}</td>
                  <td className="px-4 py-3">{req.profiles.email}</td>
                  <td className="px-4 py-3">{req.profiles.designation}</td>
                  <td className="px-4 py-3">
                    {new Date(req.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleAction(req.id, 'APPROVE')}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm mr-2"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'REJECT')}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <div className="p-8 text-center text-gray-400">No pending reset requests</div>
          )}
        </div>
      </main>
    </div>
  );
}
