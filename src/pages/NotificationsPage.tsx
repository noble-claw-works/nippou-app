import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { EmptyState } from '../components/ui/EmptyState';

const TYPE_ICON: Record<string, string> = {
  comment: '💬', sent_back: '↩', confirmed: '✅', reminder: '⏰', other: '🔔',
};

export function NotificationsPage() {
  const { notifications, reports, currentUserId, markNotificationRead, markAllNotificationsRead, deleteNotification } = useAppStore();
  const navigate = useNavigate();
  const userNotifs = [...notifications.filter(n => n.userId === currentUserId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  const handleClick = (n: typeof userNotifs[number]) => {
    markNotificationRead(n.id);
    if (n.relatedReportId) {
      const r = reports.find(rep => rep.id === n.relatedReportId);
      if (r) {
        navigate(`/reports/${r.date}?user=${r.userId}`);
        return;
      }
    }
    // リマインダー系として Today へ
    if (n.type === 'reminder') {
      navigate('/today');
    } else {
      navigate('/calendar');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">🔔 通知 {unreadCount > 0 && <span className="text-sm text-blue-600 ml-1">({unreadCount})</span>}</h1>
        <button onClick={markAllNotificationsRead}
          className="text-sm text-blue-600 hover:underline">すべて既読</button>
      </div>

      {userNotifs.length === 0 ? (
        <EmptyState icon="🌱" title="お知らせはありません" />
      ) : (
        <div className="space-y-2">
          {userNotifs.map(n => (
            <div key={n.id}
              onClick={() => handleClick(n)}
              className={`flex gap-3 p-4 bg-white rounded-xl border cursor-pointer hover:shadow-sm transition-all ${!n.isRead ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
              <span className="text-2xl flex-shrink-0">{TYPE_ICON[n.type]}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{n.createdAt.slice(0, 16).replace('T', ' ')}</p>
              </div>
              <div className="flex items-start gap-1">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="p-1 text-gray-300 hover:text-gray-500 flex-shrink-0">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
