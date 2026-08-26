import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  AlertTriangle,
  Users,
  CreditCard,
  LogOut,
} from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';

const NAV = [
  { to: '/',            icon: BarChart3,     label: 'Overview'    },
  { to: '/content',     icon: FileText,      label: 'Content'     },
  { to: '/moderation',  icon: AlertTriangle, label: 'Moderation'  },
  { to: '/users',       icon: Users,         label: 'Users'       },
  { to: '/ledger',      icon: CreditCard,    label: 'Ledger'      },
];

export default function Sidebar(): React.JSX.Element {
  const { profile, signOut } = useAdminAuth();

  const getInitials = (name?: string): string => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <aside className="w-64 bg-gray-900 text-white h-screen flex flex-col justify-between border-r border-gray-800 flex-shrink-0">
      <div>
        {/* Logo Section */}
        <div className="py-6 px-6 border-b border-gray-800 flex items-center gap-3">
          <span className="text-brand-400 text-2xl font-bold">✝</span>
          <div>
            <div className="text-white font-bold text-lg leading-none">Too Humble</div>
            <div className="text-gray-400 text-xs mt-1">Admin Panel</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 px-2 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white font-medium shadow-sm'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User & Sign Out Section */}
      <div className="p-4 border-t border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3 mb-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-9 h-9 rounded-full object-cover border border-gray-700"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center border border-gray-700">
              {getInitials(profile?.full_name)}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <div className="text-sm font-semibold text-white truncate">
              {profile?.full_name || 'Administrator'}
            </div>
            <div className="text-xs text-brand-400 font-medium">Admin</div>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
