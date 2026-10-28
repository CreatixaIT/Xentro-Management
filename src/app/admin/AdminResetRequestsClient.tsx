'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Key, X, Clock } from 'lucide-react';

interface ResetRequest {
  id: string;
  profile_id: string;
  status: string;
  requested_at: string;
  notes: string;
  profiles: {
    username: string;
    full_name: string;
    email: string;
    designation: string;
  };
}

interface AdminResetRequestsClientProps {
  profile: {
    full_name: string;
    username: string;
    designation: string;
    id: string;
    avatar_path?: string;
  };
}

export default function AdminResetRequestsClient({ profile }: AdminResetRequestsClientProps) {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/reset-requests');
      if (!response.ok) throw new Error('Failed to fetch reset requests');
      const data = await response.json();
      // API returns { requests, pagination }, extract the requests array
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setIsResetting(true);
    setResetError('');
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: selectedRequest?.profile_id,
          new_password: newPassword,
        }),
      });
      if (!response.ok) throw new Error('Failed to reset password');
      setResetSuccess('Password reset successfully');
      fetchRequests();
      setTimeout(closeResetModal, 2000);
    } catch (err) {
      setResetError('Failed to reset password');
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const response = await fetch('/api/admin/reset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error('Failed to update request');
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-5 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Password Reset Requests</h1>

        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.10)' }}>
                <tr>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Username</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Name</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Email</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Designation</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Requested</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Status</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#F4F7FF', fontSize: '0.875rem' }}>{req.profiles.username}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#F4F7FF', fontSize: '0.875rem' }}>{req.profiles.full_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#B4BED1', fontSize: '0.875rem' }}>{req.profiles.email}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#B4BED1', fontSize: '0.875rem' }}>{req.profiles.designation}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#B4BED1', fontSize: '0.875rem' }}>{new Date(req.requested_at).toLocaleString()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: req.status === 'PENDING' ? 'rgba(245, 158, 11, 0.20)' :
                                       req.status === 'APPROVED' ? 'rgba(139, 92, 246, 0.20)' :
                                       req.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.20)' : 'rgba(100, 116, 139, 0.20)',
                        color: req.status === 'PENDING' ? '#F59E0B' : req.status === 'APPROVED' ? '#8B5CF6' : req.status === 'COMPLETED' ? '#10B981' : '#64748B'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      {req.status === 'PENDING' && (
                        <>
                          <button onClick={() => openResetModal(req)} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors" style={{ backgroundColor: 'rgba(139, 92, 246, 0.20)', color: '#8B5CF6' }}>Reset Password</button>
                          <button onClick={() => handleAction(req.id, 'REJECT')} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors" style={{ backgroundColor: 'rgba(100, 116, 139, 0.20)', color: '#64748B' }}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {requests.length === 0 && <div className="p-6 md:p-8 text-center" style={{ color: '#8995AD', fontSize: '0.875rem' }}>No pending reset requests</div>}
        </div>
      </div>

      {showResetModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-md w-full" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#F4F7FF' }}>Reset Password</h2>
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(29, 38, 60, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <p className="text-sm" style={{ color: '#B4BED1' }}><strong style={{ color: '#F4F7FF' }}>Employee:</strong> {selectedRequest.profiles.full_name}</p>
              <p className="text-sm" style={{ color: '#B4BED1' }}><strong style={{ color: '#F4F7FF' }}>Username:</strong> {selectedRequest.profiles.username}</p>
              <p className="text-sm" style={{ color: '#B4BED1' }}><strong style={{ color: '#F4F7FF' }}>Email:</strong> {selectedRequest.profiles.email}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#F4F7FF' }}>New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl backdrop-blur-xl"
                    style={{ backgroundColor: 'rgba(20, 27, 45, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F4F7FF' }}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#F4F7FF' }}>Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl backdrop-blur-xl"
                  style={{ backgroundColor: 'rgba(20, 27, 45, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F4F7FF' }}
                  placeholder="Confirm new password"
                />
              </div>
              {resetError && <div className="px-4 py-2 rounded-xl text-sm backdrop-blur-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.20)', border: '1px solid rgba(239, 68, 68, 0.50)', color: '#FCA5A5' }}>{resetError}</div>}
              {resetSuccess && <div className="px-4 py-2 rounded-xl text-sm backdrop-blur-xl" style={{ backgroundColor: 'rgba(16, 185, 129, 0.20)', border: '1px solid rgba(16, 185, 129, 0.50)', color: '#86EFAC' }}>{resetSuccess}</div>}
              <div className="flex gap-2 justify-end">
                <button onClick={closeResetModal} disabled={isResetting} className="px-4 py-2 rounded-xl transition-colors" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#F4F7FF' }}>Cancel</button>
                <button onClick={handleResetPassword} disabled={isResetting || !newPassword || !confirmPassword} className="px-4 py-2 rounded-xl transition-all" style={{ background: 'linear-gradient(to right, #8B5CF6, #60A5FA)', color: '#F4F7FF', opacity: (!newPassword || !confirmPassword) ? 0.5 : 1 }}>
                  {isResetting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
