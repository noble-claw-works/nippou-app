import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Calendar, Search, BarChart3, Users, FileText,
  Settings, ShieldCheck, Bell, ChevronDown, RefreshCw,
  Menu, X as XIcon, LogOut, Handshake
} from 'lucide-react';
import { useAppStore } from '../../store';
import { ROLE_LABELS, ROLE_DEMO_USERS } from '../../utils';
import type { Role } from '../../types';
import { NotificationBell } from '../notifications/NotificationBell';

const NAV_ITEMS = [
  { to: '/today',     icon: Home,       label: 'Today',       roles: ['general','manager','executive','admin'] },
  { to: '/calendar',  icon: Calendar,   label: 'カレンダー',  roles: ['general','manager','executive','admin'] },
  { to: '/search',    icon: Search,     label: '検索',        roles: ['general','manager','executive','admin'] },
  { to: '/dashboard', icon: BarChart3,  label: 'ダッシュボード', roles: ['manager','executive'] },
  { to: '/households', icon: Users,      label: '世帯',        roles: ['general','manager','executive','admin'] },
  { to: '/opportunities', icon: Handshake, label: '商談',      roles: ['general','manager','executive','admin'] },
  { to: '/templates', icon: FileText,   label: 'テンプレート', roles: ['admin'] },
  { to: '/admin',     icon: ShieldCheck,label: '管理',        roles: ['admin'] },
  { to: '/settings',  icon: Settings,   label: '設定',        roles: ['general','manager','executive','admin'] },
];

const ROLES: Role[] = ['general', 'manager', 'executive', 'admin'];

export function AppShell({ children }: { children: ReactNode }) {
  const { currentRole, currentUserId, setRole, addToast, resetAll, notifications, logout } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAppStore(s => s.users.find(u => u.id === s.currentUserId));
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    logout();
    addToast({ type: 'info', message: 'ログアウトしました' });
    setMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const handleRoleChange = (role: Role) => {
    setRole(role);
    addToast({ type: 'info', message: `ロールを切り替えました: ${ROLE_LABELS[role]} (${ROLE_DEMO_USERS[role]})` });
    setMenuOpen(false);
    navigate('/today');
  };

  const visibleNav = NAV_ITEMS.filter(n => (n.roles as Role[]).includes(currentRole));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar (PC) */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">📋 305-hrl-nippou-app</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-bold">📋 305-hrl-nippou-app</span>
              <button onClick={() => setMobileNavOpen(false)}><XIcon className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {visibleNav.map(item => (
                <NavLink key={item.to} to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                      isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 z-30">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Role Switcher */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors max-w-[200px] sm:max-w-none">
              <span className="font-medium text-blue-700 truncate">{ROLE_LABELS[currentRole]}</span>
              <span className="text-gray-500 text-xs truncate hidden sm:inline">{user?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1">
                {ROLES.map(role => (
                  <button key={role} onClick={() => handleRoleChange(role)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${currentRole === role ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    {ROLE_LABELS[role]} <span className="text-gray-400 text-xs ml-1">({ROLE_DEMO_USERS[role]})</span>
                  </button>
                ))}
                <hr className="my-1 border-gray-100" />
                {user && (
                  <div className="px-4 py-2 text-xs text-gray-500">
                    <span className="block">ログイン中:</span>
                    <span className="block font-medium text-gray-800 truncate">{user.name}</span>
                    <span className="block text-[10px] truncate">{user.email}</span>
                  </div>
                )}
                <button onClick={() => { resetAll(); addToast({ type: 'info', message: 'デモをリセットしました' }); setMenuOpen(false); navigate('/login', { replace: true }); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> デモをリセット
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> ログアウト
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden bg-white border-t border-gray-200 flex">
          {visibleNav.slice(0, 4).map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
              }
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
