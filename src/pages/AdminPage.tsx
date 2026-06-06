import { useState } from 'react';
import { useAppStore } from '../store';
import { ForbiddenState } from '../components/ui/EmptyState';
import { UsersTab } from '../components/admin/UsersTab';
import { TeamsTab } from '../components/admin/TeamsTab';

// =============================
// Audit Log Tab
// =============================
function AuditLogTab() {
  const { auditLogs, users } = useAppStore();
  const sorted = [...auditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <div className="space-y-2">
        {sorted.map(log => {
          const user = users.find(u => u.id === log.userId);
          return (
            <div key={log.id} className="p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs flex-shrink-0">
                  {user?.avatarInitials ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{user?.name ?? log.userId}</span>
                    <span className="text-sm text-gray-700">{log.action}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.result === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.result === 'success' ? '成功' : '失敗'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{log.createdAt.slice(0, 16).replace('T', ' ')} · IP: {log.ip}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================
// Main Admin Page
// =============================
export function AdminPage() {
  const { currentRole } = useAppStore();
  const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'audit'>('users');

  // admin: 読み書き / executive: 読取専用 / それ以外: Forbidden
  if (!['admin', 'executive'].includes(currentRole)) {
    return <div className="px-4 py-8"><ForbiddenState /></div>;
  }

  const canEdit = currentRole === 'admin';

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">管理</h1>
      {currentRole === 'executive' && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。
        </div>
      )}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 w-fit">
        {([['users', '👥 ユーザー'], ['teams', '🏢 チーム'], ['audit', '📜 監査ログ']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === id ? 'bg-white shadow font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        {activeTab === 'users' && <UsersTab canEdit={canEdit} />}
        {activeTab === 'teams' && <TeamsTab canEdit={canEdit} />}
        {activeTab === 'audit' && <AuditLogTab />}
      </div>
    </div>
  );
}
