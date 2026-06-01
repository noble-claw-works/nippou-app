import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAppStore } from '../store';
import { ForbiddenState, EmptyState, FormField } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Role, User, Team } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  general: '一般社員', manager: '上長', executive: '経営者', admin: '管理者',
};

// =============================
// Users Tab
// =============================
function UsersTab() {
  const { users, teams, addUser, updateUser, deactivateUser, addToast } = useAppStore();
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'general' as Role, teamId: '' });

  const filtered = users.filter(u =>
    !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ユーザーを検索"
              className="pl-9 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-48" />
          </div>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 招待
        </button>
      </div>

      {filtered.length === 0 ? <EmptyState icon="👤" title="ユーザーがいません" /> : (
        <div className="space-y-2">
          {filtered.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                {user.avatarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{ROLE_LABELS[user.role]}</span>
                  {user.status === 'inactive' && <span className="text-xs text-red-500">無効</span>}
                </div>
                {user.teamIds.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    チーム: {user.teamIds.map(tid => teams.find(t => t.id === tid)?.name ?? tid).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {user.status === 'active' && (
                  <button onClick={() => setDeactivateId(user.id)}
                    className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    無効化
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="ユーザーを招待" size="sm"
        footer={
          <>
            <button onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">キャンセル</button>
            <button onClick={() => {
              if (!form.name.trim() || !form.email.trim()) return;
              addUser({ name: form.name, email: form.email, role: form.role, teamIds: form.teamId ? [form.teamId] : [], status: 'invited', avatarInitials: form.name[0] });
              setShowInvite(false); setForm({ name: '', email: '', role: 'general', teamId: '' });
              addToast({ type: 'success', message: '招待メールを送信しました' });
            }} disabled={!form.name.trim() || !form.email.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">招待する</button>
          </>
        }>
        <div className="space-y-3">
          <FormField label="氏名" required>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </FormField>
          <FormField label="メールアドレス" required>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </FormField>
          <FormField label="ロール">
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog open={!!deactivateId} onClose={() => setDeactivateId(null)}
        onConfirm={() => { deactivateUser(deactivateId!); addToast({ type: 'info', message: '無効化しました' }); }}
        title="ユーザーを無効化しますか？"
        message={
          <div className="space-y-2">
            <p>「{users.find(u => u.id === deactivateId)?.name}」を無効化します。</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>過去の日報・コメントは保持されます</li>
              <li>ログインができなくなります</li>
              <li>チームのメンバー一覧から外れます</li>
            </ul>
          </div>
        }
        confirmLabel="無効化する" />
    </div>
  );
}

// =============================
// Teams Tab
// =============================
function TeamsTab() {
  const { teams, users, addTeam, deleteTeam, addToast } = useAppStore();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 新規作成
        </button>
      </div>

      {teams.length === 0 ? <EmptyState icon="🏢" title="チームがありません" /> : (
        <div className="space-y-2">
          {teams.map(team => {
            const managers = team.managerIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
            const members = team.memberIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
            return (
              <div key={team.id} className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">🏢 {team.name}</h3>
                    {team.description && <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      上長: {managers.join(', ') || 'なし'} · メンバー: {members.length}名
                    </p>
                  </div>
                  <button onClick={() => { setDeleteId(team.id); setDeleteInput(''); }}
                    className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="チームを作成" size="sm"
        footer={
          <>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">キャンセル</button>
            <button onClick={() => {
              if (!form.name.trim()) return;
              addTeam({ name: form.name, description: form.description, managerIds: [], memberIds: [] });
              setShowNew(false); setForm({ name: '', description: '' });
              addToast({ type: 'success', message: 'チームを作成しました' });
            }} disabled={!form.name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">作成する</button>
          </>
        }>
        <div className="space-y-3">
          <FormField label="チーム名" required>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </FormField>
          <FormField label="説明">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteTeam(deleteId!); addToast({ type: 'info', message: 'チームを削除しました' }); }}
        title="チームを削除しますか？"
        message={`「${teams.find(t => t.id === deleteId)?.name}」を削除します。メンバーはチームから外れます（ユーザー自体は削除されません）。`}
        confirmLabel="削除する"
        requireInput={teams.find(t => t.id === deleteId)?.name}
        inputValue={deleteInput}
        onInputChange={setDeleteInput} />
    </div>
  );
}

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

  if (currentRole !== 'admin') return <div className="px-4 py-8"><ForbiddenState /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">管理</h1>
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 w-fit">
        {[['users', '👥 ユーザー'], ['teams', '🏢 チーム'], ['audit', '📜 監査ログ']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === id ? 'bg-white shadow font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'teams' && <TeamsTab />}
        {activeTab === 'audit' && <AuditLogTab />}
      </div>
    </div>
  );
}
