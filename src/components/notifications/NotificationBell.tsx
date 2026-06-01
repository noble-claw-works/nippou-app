import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead, currentUserId } = useAppStore();
  const userNotifs = notifications.filter(n => n.userId === currentUserId).slice(0, 5);
  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  const TYPE_ICON: Record<string, string> = {
    comment: '💬', sent_back: '↩', confirmed: '✅', reminder: '⏰', other: '🔔',
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm">通知 {unreadCount > 0 && `(${unreadCount}件)`}</span>
            <button onClick={() => markAllNotificationsRead()}
              className="text-xs text-blue-600 hover:underline">すべて既読</button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {userNotifs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">お知らせはありません 🌱</div>
            ) : userNotifs.map(n => (
              <div key={n.id} onClick={() => { markNotificationRead(n.id); setOpen(false); if (n.relatedReportId) navigate('/calendar'); }}
                className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${!n.isRead ? 'bg-blue-50' : ''}`}>
                <span className="text-lg flex-shrink-0">{TYPE_ICON[n.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.createdAt.slice(0, 16).replace('T', ' ')}</p>
                </div>
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <button onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-sm text-blue-600 hover:underline w-full text-center">
              すべての通知を見る →
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
