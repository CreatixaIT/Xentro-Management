'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ResetRequest {
  id: string;
  status: string;
  requested_at: string;
  notes: string | null;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    designation: string;
  };
}

export default function AdminResetRequests() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ResetRequest | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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

  const openResetModal = (request: ResetRequest) => {
    setSelectedRequest(request);
    setShowResetModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setSelectedRequest(null);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async () => {
    setResetError('');
    setResetSuccess('');

    if (!selectedRequest) return;

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
      return;
    }

    setIsResetting(true);

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'Failed to reset password');
        setIsResetting(false);
        return;
      }

      setResetSuccess(data.message || 'Password reset successfully');
      setTimeout(() => {
        closeResetModal();
        fetchRequests();
      }, 2000);
    } catch (err) {
      setResetError('An unexpected error occurred');
    } finally {
      setIsResetting(false);
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
                <th className="px-4 py-3 text-left">Status</th>
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
                    {new Date(req.requested_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      req.status === 'PENDING' ? 'bg-yellow-600' :
                      req.status === 'APPROVED' ? 'bg-blue-600' :
                      req.status === 'COMPLETED' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openResetModal(req)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm mr-2"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'REJECT')}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
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

      {/* Reset Password Modal */}
      {showResetModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            
            <div className="mb-4 p-4 bg-gray-700 rounded">
              <p className="text-sm text-gray-300">
                <strong>Employee:</strong> {selectedRequest.profiles.full_name}
              </p>
              <p className="text-sm text-gray-300">
                <strong>Username:</strong> {selectedRequest.profiles.username}
              </p>
              <p className="text-sm text-gray-300">
                <strong>Email:</strong> {selectedRequest.profiles.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 text-white"
                  placeholder="Confirm new password"
                />
              </div>

              {resetError && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-2 rounded text-sm">
                  {resetSuccess}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeResetModal}
                  disabled={isResetting}
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResetting || !newPassword || !confirmPassword}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
