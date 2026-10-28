'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Search, UserCheck, UserX, Clock } from 'lucide-react';

interface Employee {
  id: string;
  username: string;
  full_name: string;
  email: string;
  designation: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  age: number;
  address: string;
  blood_group: string;
  contact_number: string;
  emergency_contact_number: string;
  avatar_path: string;
}

interface EmployeeDetails extends Employee {
  photoUrl?: string;
  resetRequests?: Array<{
    status: string;
    requested_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
  }>;
}

interface AdminEmployeesClientProps {
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

export default function AdminEmployeesClient({ profile }: AdminEmployeesClientProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const fetchEmployees = async () => {
    try {
      const url = new URL('/api/admin/employees', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (employeeId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/employees/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, status: newStatus }),
      });
      if (response.ok) {
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDetailsModal = async (employee: Employee) => {
    setSelectedEmployee(null);
    setShowDetailsModal(true);
    setDetailsLoading(true);

    try {
      const response = await fetch(`/api/admin/employee-details?id=${employee.id}`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      setSelectedEmployee({
        ...data.employee,
        photoUrl: data.photoUrl,
        resetRequests: data.resetRequests,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };

  const formatDate = (dateValue: string | null | undefined): string => {
    if (!dateValue) return '—';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleString();
    } catch {
      return '—';
    }
  };

  const displayValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  if (loading) return <div className="text-white text-center py-12">Loading...</div>;

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-white">User Management</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 md:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm md:text-base"
          >
            <option value="" className="bg-slate-900">All Status</option>
            <option value="PENDING" className="bg-slate-900">Pending</option>
            <option value="ACTIVE" className="bg-slate-900">Active</option>
            <option value="SUSPENDED" className="bg-slate-900">Suspended</option>
          </select>
        </div>

        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Username</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Name</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Designation</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Status</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Role</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <button
                        onClick={() => openDetailsModal(emp)}
                        className="text-yellow-400 hover:text-yellow-300 font-medium hover:underline text-xs md:text-sm"
                      >
                        {emp.username}
                      </button>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white text-xs md:text-sm">{emp.full_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white/70 text-xs md:text-sm">{emp.designation}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                        emp.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-white/70 text-xs md:text-sm">{emp.role}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <button
                        onClick={() => openDetailsModal(emp)}
                        className="text-blue-400 hover:text-blue-300 text-xs md:text-sm mr-2 md:mr-3"
                      >
                        View Details
                      </button>
                      {emp.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(emp.id, 'ACTIVE')}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {emp.status === 'ACTIVE' && (
                        <button
                          onClick={() => updateStatus(emp.id, 'SUSPENDED')}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                      {emp.status === 'SUSPENDED' && (
                        <button
                          onClick={() => updateStatus(emp.id, 'ACTIVE')}
                          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {employees.length === 0 && (
            <div className="p-6 md:p-8 text-center text-white/50 text-xs md:text-sm">No employees found</div>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-white">Employee Details</h2>
              <button
                onClick={closeDetailsModal}
                className="text-white/60 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-center py-8 text-white">Loading...</div>
            ) : selectedEmployee ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  {selectedEmployee.photoUrl ? (
                    <img
                      src={selectedEmployee.photoUrl}
                      alt="Profile photo"
                      className="w-24 h-24 rounded-xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center">
                      <span className="text-4xl">👤</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{selectedEmployee.full_name}</h3>
                    <p className="text-white/60">@{selectedEmployee.username}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        selectedEmployee.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {selectedEmployee.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEmployee.role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {selectedEmployee.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold mb-3 text-white">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Full Name:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.full_name)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Username:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.username)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Email:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.email)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Phone:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.contact_number)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Emergency Contact:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.emergency_contact_number)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Age:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.age)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Blood Group:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.blood_group)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Designation:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.designation)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-white/60">Address:</span>
                      <p className="font-medium text-white">{displayValue(selectedEmployee.address)}</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="font-semibold mb-3 text-white">Account Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">User ID:</span>
                      <p className="font-medium text-white text-xs">{selectedEmployee.id}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Role:</span>
                      <p className="font-medium text-white">{selectedEmployee.role}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Status:</span>
                      <p className="font-medium text-white">{selectedEmployee.status}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Created:</span>
                      <p className="font-medium text-white">{formatDate(selectedEmployee.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Last Updated:</span>
                      <p className="font-medium text-white">{formatDate(selectedEmployee.updated_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Password Reset History */}
                {selectedEmployee.resetRequests && selectedEmployee.resetRequests.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="font-semibold mb-3 text-white">Password Reset History</h4>
                    <div className="space-y-2">
                      {selectedEmployee.resetRequests.map((req, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-white/20 pl-3">
                          <p className="text-white/60">Requested: {formatDate(req.requested_at)}</p>
                          <p className="text-white/60">Status: {req.status}</p>
                          {req.resolved_at && (
                            <p className="text-white/60">Resolved: {formatDate(req.resolved_at)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={closeDetailsModal}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
