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
}

interface AdminEmployeesClientProps {
  profile: {
    full_name: string;
    username: string;
    designation: string;
    id: string;
    avatar_path?: string;
  };
}

export default function AdminEmployeesClient({ profile }: AdminEmployeesClientProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/admin/employees?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      // API returns { employees, pagination }, extract the employees array
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/admin/employees/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const displayValue = (value: string | number | null) => value ?? 'N/A';

  return (
    <AdminLayout profile={profile}>
      <div className="space-y-5 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>User Management</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="backdrop-blur-xl rounded-xl px-3 md:px-4 py-2 shadow-2xl"
            style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)', color: '#F4F7FF' }}
          >
            <option value="" style={{ backgroundColor: '#080B14', color: '#F4F7FF' }}>All Status</option>
            <option value="PENDING" style={{ backgroundColor: '#080B14', color: '#F4F7FF' }}>Pending</option>
            <option value="ACTIVE" style={{ backgroundColor: '#080B14', color: '#F4F7FF' }}>Active</option>
            <option value="SUSPENDED" style={{ backgroundColor: '#080B14', color: '#F4F7FF' }}>Suspended</option>
          </select>
        </div>

        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.10)' }}>
                <tr>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Username</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Name</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Designation</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Status</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Role</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold" style={{ color: '#F4F7FF' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <button
                        onClick={() => openDetailsModal(emp)}
                        className="font-medium hover:underline text-xs md:text-sm"
                        style={{ color: '#8B5CF6' }}
                      >
                        {emp.username}
                      </button>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#F4F7FF', fontSize: '0.875rem' }}>{emp.full_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#B4BED1', fontSize: '0.875rem' }}>{emp.designation}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                        backgroundColor: emp.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.20)' :
                                       emp.status === 'PENDING' ? 'rgba(245, 158, 11, 0.20)' : 'rgba(100, 116, 139, 0.20)',
                        color: emp.status === 'ACTIVE' ? '#10B981' : emp.status === 'PENDING' ? '#F59E0B' : '#64748B'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3" style={{ color: '#B4BED1', fontSize: '0.875rem' }}>{emp.role}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <button onClick={() => openDetailsModal(emp)} className="text-xs md:text-sm mr-2 md:mr-3" style={{ color: '#8B5CF6' }}>View Details</button>
                      {emp.status === 'PENDING' && (
                        <button onClick={() => updateStatus(emp.id, 'ACTIVE')} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors" style={{ backgroundColor: 'rgba(16, 185, 129, 0.20)', color: '#10B981' }}>Approve</button>
                      )}
                      {emp.status === 'ACTIVE' && (
                        <button onClick={() => updateStatus(emp.id, 'SUSPENDED')} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm mr-1 md:mr-2 transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.20)', color: '#EF4444' }}>Suspend</button>
                      )}
                      {emp.status === 'SUSPENDED' && (
                        <button onClick={() => updateStatus(emp.id, 'ACTIVE')} className="px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors" style={{ backgroundColor: 'rgba(139, 92, 246, 0.20)', color: '#8B5CF6' }}>Reactivate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {employees.length === 0 && <div className="p-6 md:p-8 text-center" style={{ color: '#8995AD', fontSize: '0.875rem' }}>No employees found</div>}
        </div>
      </div>

      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'rgba(20, 27, 45, 0.72)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#F4F7FF' }}>Employee Details</h2>
              <button onClick={closeDetailsModal} className="text-2xl transition-colors" style={{ color: '#B4BED1' }}>×</button>
            </div>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 27, 45, 0.5)' }}>
                  <span className="text-4xl">👤</span>
                </div>
                <div>
                  <p className="text-xl font-semibold" style={{ color: '#F4F7FF' }}>{selectedEmployee.full_name}</p>
                  <p style={{ color: '#B4BED1' }}>@{selectedEmployee.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span style={{ color: '#8995AD' }}>Full Name:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.full_name)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Username:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.username)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Email:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.email)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Phone:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.contact_number)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Emergency Contact:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.emergency_contact_number)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Age:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.age)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Blood Group:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.blood_group)}</p></div>
                <div><span style={{ color: '#8995AD' }}>Designation:</span><p className="font-medium" style={{ color: '#F4F7FF' }}>{displayValue(selectedEmployee.designation)}</p></div>
              </div>
              <button onClick={closeDetailsModal} className="px-4 py-2 rounded-xl transition-colors" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#F4F7FF' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
