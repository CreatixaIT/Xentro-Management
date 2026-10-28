'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

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

interface AdminResetRequestsClientProps {
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

export default function AdminResetRequestsClient({ profile }: AdminResetRequestsClientProps) {
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

  if (loading) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-white">Password Reset Requests</h1>

        <div className="relative bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Username</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Name</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Email</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Designation</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Requested</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Status</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white text-xs md:text-sm">{req.profiles.username}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white text-xs md:text-sm">{req.profiles.full_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white/70 text-xs md:text-sm">{req.profiles.email}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white/70 text-xs md:text-sm">{req.profiles.designation}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white/70 text-xs md:text-sm">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        req.status === 'PENDING' ? 'bg-red-500/20 text-red-400' :
                        req.status === 'APPROVED' ? 'bg-yellow-500/20 text-yellow-400' :
                        req.status === 'COMPLETED' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-black/40 text-white'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openResetModal(req)}
                            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'REJECT')}
                            className="bg-black/40 hover:bg-black/50 text-white px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors"
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
          </div>
          {requests.length === 0 && (
            <div className="p-6 md:p-8 text-center text-white/50 text-xs md:text-sm">No pending reset requests</div>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-6 max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="text-xl font-bold mb-4 text-white">Reset Password</h2>
            
            <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-white/70">
                <strong className="text-white">Employee:</strong> {selectedRequest.profiles.full_name}
              </p>
              <p className="text-sm text-white/70">
                <strong className="text-white">Username:</strong> {selectedRequest.profiles.username}
              </p>
              <p className="text-sm text-white/70">
                <strong className="text-white">Email:</strong> {selectedRequest.profiles.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 backdrop-blur-xl"
                  placeholder="Confirm new password"
                />
              </div>

              {resetError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-sm backdrop-blur-xl">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-2 rounded-xl text-sm backdrop-blur-xl">
                  {resetSuccess}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={closeResetModal}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:bg-white/5 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isResetting || !newPassword || !confirmPassword}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white disabled:from-white/10 disabled:to-white/10 disabled:cursor-not-allowed transition-all"
                >
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
