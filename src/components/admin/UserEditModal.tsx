import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/EmptyState';
import type { Role, User, Team } from '../../types';

const ROLE_LABELS: Record<Role, string> = {
  general: '一般社員', manager: '上長', executive: '経営者', admin: '管理者',
};

interface Props {
  user: User | null;
  teams: Team[];
  onClose: () => void;
  onSave: (userId: string, updates: Partial<User>) => void;
}

export function UserEditModal({ user, teams, onClose, onSave }: Props) {
  const [form, setForm] = useState({ name: '', email: '', role: 'general' as Role, teamIds: [] as string[] });

  // フォームをモーダル対象(user)の変化に合わせて同期する意図的なパターン。
  // setForm は user が存在するときのみ呼び、cascading renderの実害はない。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, role: user.role, teamIds: [...user.teamIds] });
    }
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTeam = (teamId: string) => {
    setForm(f => ({
      ...f,
      teamIds: f.teamIds.includes(teamId)
        ? f.teamIds.filter(id => id !== teamId)
        : [...f.teamIds, teamId],
    }));
  };

  const handleSave = () => {
    if (!user || !form.name.trim() || !form.email.trim()) return;
    onSave(user.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      teamIds: form.teamIds,
      avatarInitials: form.name.trim()[0] ?? user.avatarInitials,
    });
    onClose();
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="ユーザーを編集"
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || !form.email.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50"
          >
            保存する
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
        <FormField label="所属チーム">
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
            {teams.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">チームがありません</p>
            )}
            {teams.map(team => (
              <label key={team.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.teamIds.includes(team.id)}
                  onChange={() => toggleTeam(team.id)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{team.name}</span>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    </Modal>
  );
}
