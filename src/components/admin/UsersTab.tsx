import { useState } from 'react';
import { Plus, Search, Pencil } from 'lucide-react';
import { useAppStore } from '../../store';
import { EmptyState, FormField } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UserEditModal } from './UserEditModal';
import { getManagersOf } from '../../utils/orgChart';
import type { Role, User } from '../../types';

const ROLE_LABELS: Record<Role, string> = {
  general: '一般社員', manager: '上長', executive: '経営者', admin: '管理者',
};

interface Props {
  canEdit: boolean;
}

export function UsersTab({ canEdit }: Props) {
  const { users, teams, addUser, updateUser, deactivateUser, addToast } = useAppStore();
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
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
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ユーザーを検索"
              className="pl-9 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-48"
            />
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 招待
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="👤" title="ユーザーがいません" />
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const managers = getManagersOf(user.id, users, teams);
            const managerLabel = managers.length > 0
              ? managers.map(m => m.name).join(', ') + ' (チーム経由)'
              : '上長未設定';
            return (
              <div key={user.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                  {user.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{user.name}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {ROLE_LABELS[user.role]}
                    </span>
                    {user.status === 'inactive' && <span className="text-xs text-red-500">無効</span>}
                  </div>
                  {user.teamIds.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      チーム: {user.teamIds.map(tid => teams.find(t => t.id === tid)?.name ?? tid).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    上長: {managerLabel}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditUser(user)}
                      className="px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> 編集
                    </button>
                    {user.status === 'active' && (
                      <button
                        onClick={() => setDeactivateId(user.id)}
                        className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        無効化
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="ユーザーを招待"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!form.name.trim() || !form.email.trim()) return;
                addUser({
                  name: form.name, email: form.email, role: form.role,
                  teamIds: form.teamId ? [form.teamId] : [], status: 'invited',
                  avatarInitials: form.name[0],
                });
                setShowInvite(false);
                setForm({ name: '', email: '', role: 'general', teamId: '' });
                addToast({ type: 'success', message: '招待メールを送信しました' });
              }}
              disabled={!form.name.trim() || !form.email.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50"
            >
              招待する
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="氏名" required>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </FormField>
          <FormField label="メールアドレス" required>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </FormField>
          <FormField label="ロール">
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Modal>

      {/* Edit Modal */}
      <UserEditModal
        user={editUser}
        teams={teams}
        onClose={() => setEditUser(null)}
        onSave={(userId, updates) => {
          updateUser(userId, updates);
          addToast({ type: 'success', message: 'ユーザー情報を更新しました' });
        }}
      />

      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => {
          deactivateUser(deactivateId!);
          addToast({ type: 'info', message: '無効化しました' });
        }}
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
        confirmLabel="無効化する"
      />
    </div>
  );
}
