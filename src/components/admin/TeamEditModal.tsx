import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/EmptyState';
import type { User, Team } from '../../types';

interface Props {
  team: Team | null;
  users: User[];
  onClose: () => void;
  onSave: (teamId: string, updates: Partial<Team>) => void;
}

export function TeamEditModal({ team, users, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    memberIds: [] as string[],
    managerIds: [] as string[],
  });

  // フォームをモーダル対象(team)の変化に合わせて同期する意図的なパターン。
  // setForm は team が存在するときのみ呼び、cascading renderの実害はない。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (team) {
      setForm({
        name: team.name,
        description: team.description ?? '',
        memberIds: [...team.memberIds],
        managerIds: [...team.managerIds],
      });
    }
  }, [team]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleMember = (userId: string) => {
    setForm(f => {
      const isMember = f.memberIds.includes(userId);
      const newMemberIds = isMember
        ? f.memberIds.filter(id => id !== userId)
        : [...f.memberIds, userId];
      // メンバーから外したら上長からも外す
      const newManagerIds = isMember
        ? f.managerIds.filter(id => id !== userId)
        : f.managerIds;
      return { ...f, memberIds: newMemberIds, managerIds: newManagerIds };
    });
  };

  const toggleManager = (userId: string) => {
    // 上長はメンバーのみ選択可
    if (!form.memberIds.includes(userId)) return;
    setForm(f => ({
      ...f,
      managerIds: f.managerIds.includes(userId)
        ? f.managerIds.filter(id => id !== userId)
        : [...f.managerIds, userId],
    }));
  };

  const handleSave = () => {
    if (!team || !form.name.trim()) return;
    onSave(team.id, {
      name: form.name.trim(),
      description: form.description.trim(),
      memberIds: form.memberIds,
      managerIds: form.managerIds,
    });
    onClose();
  };

  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'invited');

  return (
    <Modal
      open={!!team}
      onClose={onClose}
      title="チームを編集"
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
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50"
          >
            保存する
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="チーム名" required>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </FormField>
        <FormField label="説明">
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </FormField>

        {/* メンバー選択 */}
        <FormField label="メンバー">
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto">
            {activeUsers.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">ユーザーがいません</p>
            )}
            {activeUsers.map(user => (
              <label key={user.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={form.memberIds.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{user.name}</span>
                <span className="text-xs text-gray-400">{user.email}</span>
              </label>
            ))}
          </div>
        </FormField>

        {/* 上長指定（メンバーの中から選択） */}
        <FormField label="上長">
          {form.memberIds.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">先にメンバーを追加してください</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-36 overflow-y-auto">
              {form.memberIds.map(memberId => {
                const u = activeUsers.find(u => u.id === memberId);
                if (!u) return null;
                return (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.managerIds.includes(u.id)}
                      onChange={() => toggleManager(u.id)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{u.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </FormField>
      </div>
    </Modal>
  );
}
