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
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

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
                  <td className="px-4 py-3">{emp.username}</td>
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
                    {emp.status === 'PENDING' && (
                      <button
                        onClick={() => updateStatus(emp.id, 'ACTIVE')}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                      >
                        Approve
                      </button>
                    )}
                    {emp.status === 'ACTIVE' && (
                      <button
                        onClick={() => updateStatus(emp.id, 'SUSPENDED')}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
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
    </div>
  );
}
