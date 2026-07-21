import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, History, User, LogOut,
  ChevronLeft, ChevronRight, Landmark, Menu, X,
  Users, Bell, Brain, Shield, BookUser,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { maskAccount } from '../../utils/format';
import ThemeToggle from '../ui/ThemeToggle';
import { useNotifications } from '../../hooks/useNotifications';
import toast from 'react-hot-toast';

const USER_NAV = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions',   icon: ArrowUpDown,     label: 'Transactions' },
  { to: '/history',        icon: History,         label: 'History' },
  { to: '/beneficiaries',  icon: BookUser,        label: 'Beneficiaries' },
  { to: '/notifications',  icon: Bell,            label: 'Notifications', badge: true },
  { to: '/ai',             icon: Brain,           label: 'AI Assistant' },
  { to: '/profile',        icon: User,            label: 'Profile' },
];

const ADMIN_NAV = [
  { to: '/admin',              icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/users',        icon: Users,           label: 'Users' },
  { to: '/admin/transactions', icon: ArrowUpDown,     label: 'Transactions' },
  { to: '/admin/logs',         icon: Shield,          label: 'Activity Logs' },
];

export default function Sidebar() {
  const { user, account, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const isAdmin  = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <Landmark className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-base font-bold block" style={{ color: 'var(--text-primary)' }}>NexBanking</span>
            {isAdmin && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--danger)', color: '#fff' }}>ADMIN</span>}
          </div>
        )}
      </div>

      {!collapsed && account && !isAdmin && (
        <div className="mx-3 mt-4 p-3 rounded-xl" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account</p>
          <p className="text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{maskAccount(account.accountNumber)}</p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{account.accountType}</p>
        </div>
      )}

      <nav className="flex-1 px-2 mt-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setMobileOpen(false)}
            className={() => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${collapsed ? 'justify-center' : ''}`}
            style={({ isActive }) => isActive
              ? { background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.25)' }
              : { color: 'var(--text-secondary)', border: '1px solid transparent' }
            }>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
            {!collapsed && badge && unreadCount > 0 && (
              <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--danger)', minWidth: 20, textAlign: 'center' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {collapsed && badge && unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className={`${collapsed ? 'flex justify-center' : 'px-1'} mb-2`}><ThemeToggle compact={collapsed} /></div>
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1 rounded-xl" style={{ background: 'var(--bg-input)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          </div>
        )}
        <button onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-500/10 ${collapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-full transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Landmark className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>NexBanking</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-ghost p-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 flex">
          <div className="w-64 h-full overflow-y-auto pt-14" style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
