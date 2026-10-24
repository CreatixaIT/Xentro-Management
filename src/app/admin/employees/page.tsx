'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function AdminEmployees() {
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
      // The API returns { employee, photoUrl, resetRequests }
      // Merge them into a single object for the modal
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

  // Safe date formatting helper
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

  // Safe text display helper
  const displayValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin" className="text-gray-400 hover:text-white">← Back to Dashboard</Link>
          <h1 className="text-xl font-bold">User Management</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Username</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-gray-700">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetailsModal(emp)}
                      className="text-[#FFD700] hover:underline font-medium"
                    >
                      {emp.username}
                    </button>
                  </td>
                  <td className="px-4 py-3">{emp.full_name}</td>
                  <td className="px-4 py-3">{emp.designation}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      emp.status === 'ACTIVE' ? 'bg-green-600' :
                      emp.status === 'PENDING' ? 'bg-yellow-600' : 'bg-red-600'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetailsModal(emp)}
                      className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                    >
                      View Details
                    </button>
                    {emp.status === 'PENDING' && (
                      <button
                        onClick={() => updateStatus(emp.id, 'ACTIVE')}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm mr-2"
                      >
                        Approve
                      </button>
                    )}
                    {emp.status === 'ACTIVE' && (
                      <button
                        onClick={() => updateStatus(emp.id, 'SUSPENDED')}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm mr-2"
                      >
                        Suspend
                      </button>
                    )}
                    {emp.status === 'SUSPENDED' && (
                      <button
                        onClick={() => updateStatus(emp.id, 'ACTIVE')}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && (
            <div className="p-8 text-center text-gray-400">No employees found</div>
          )}
        </div>
      </main>

      {/* Employee Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Employee Details</h2>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : selectedEmployee ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  {selectedEmployee.photoUrl ? (
                    <img
                      src={selectedEmployee.photoUrl}
                      alt="Profile photo"
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-700 flex items-center justify-center">
                      <span className="text-4xl">👤</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{selectedEmployee.full_name}</h3>
                    <p className="text-gray-400">@{selectedEmployee.username}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedEmployee.status === 'ACTIVE' ? 'bg-green-600' :
                        selectedEmployee.status === 'PENDING' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        {selectedEmployee.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedEmployee.role === 'SUPER_ADMIN' ? 'bg-purple-600' : 'bg-blue-600'
                      }`}>
                        {selectedEmployee.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Full Name:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.full_name)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Username:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.username)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.email)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Phone:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.contact_number)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Emergency Contact:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.emergency_contact_number)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Age:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.age)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Blood Group:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.blood_group)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Designation:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.designation)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Address:</span>
                      <p className="font-medium">{displayValue(selectedEmployee.address)}</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Account Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">User ID:</span>
                      <p className="font-medium text-xs">{selectedEmployee.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Role:</span>
                      <p className="font-medium">{selectedEmployee.role}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <p className="font-medium">{selectedEmployee.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <p className="font-medium">{formatDate(selectedEmployee.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Updated:</span>
                      <p className="font-medium">{formatDate(selectedEmployee.updated_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Password Reset History */}
                {selectedEmployee.resetRequests && selectedEmployee.resetRequests.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Password Reset History</h4>
                    <div className="space-y-2">
                      {selectedEmployee.resetRequests.map((req, idx) => (
                        <div key={idx} className="text-sm border-l-2 border-gray-600 pl-3">
                          <p className="text-gray-400">Requested: {formatDate(req.requested_at)}</p>
                          <p className="text-gray-400">Status: {req.status}</p>
                          {req.resolved_at && (
                            <p className="text-gray-400">Resolved: {formatDate(req.resolved_at)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={closeDetailsModal}
                    className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
