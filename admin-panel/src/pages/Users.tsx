import React, { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  Shield,
  UserCheck,
  Search,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminProfile, UserRole } from '../types';

type RoleFilter = 'all' | 'admin' | 'client';

export default function Users(): React.JSX.Element {
  const { profile: currentAdmin } = useAdminAuth();

  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg: string): void => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchUsers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data ?? []) as AdminProfile[]);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetRole = async (targetUserId: string, newRole: UserRole): Promise<void> => {
    setActionLoadingId(targetUserId);
    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      if (error) throw error;
      showToast(`✓ Role updated to ${newRole}`);
      await fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update role.';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalClients = users.filter((u) => u.role === 'client').length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim());
    if (!matchesSearch) return false;

    if (roleFilter === 'admin') return u.role === 'admin';
    if (roleFilter === 'client') return u.role === 'client';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor user accounts, authentication roles, and administrative permissions
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Users
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{users.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UsersIcon size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administrators
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{totalAdmins}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Shield size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Clients
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalClients}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>
      </div>

      {/* Controls Row: Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user name..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-gray-200/80 p-1 rounded-xl gap-1 self-start sm:self-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === 'admin'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Admins ({totalAdmins})
          </button>
          <button
            onClick={() => setRoleFilter('client')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === 'client'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Clients ({totalClients})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  const isActing = actionLoadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      {/* User */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name}
                              className="w-9 h-9 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 font-bold text-xs flex items-center justify-center border border-gray-200">
                              {getInitials(u.full_name)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                              <span>{u.full_name || 'Anonymous User'}</span>
                              {isCurrent ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                  YOU
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {u.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.role === 'admin' ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                            <Shield size={12} />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                            <UserCheck size={12} />
                            <span>Client</span>
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {u.role === 'client' ? (
                          <button
                            onClick={() => handleSetRole(u.id, 'admin')}
                            disabled={isActing}
                            className="px-3 py-1.5 border border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-50 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                          >
                            {isActing ? (
                              <span className="inline-block w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Shield size={14} />
                            )}
                            <span>Promote to Admin</span>
                          </button>
                        ) : isCurrent ? (
                          <span className="text-xs text-gray-400 italic">Self (Protected)</span>
                        ) : (
                          <button
                            onClick={() => handleSetRole(u.id, 'client')}
                            disabled={isActing}
                            className="px-3 py-1.5 border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                          >
                            {isActing ? (
                              <span className="inline-block w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            <span>Demote to Client</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-lg px-4 py-3 shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          <span>{toastMessage}</span>
        </div>
      ) : null}
    </div>
  );
}
