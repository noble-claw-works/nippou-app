import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useAppStore } from '../../store';
import { EmptyState, FormField } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TeamEditModal } from './TeamEditModal';
import type { Team } from '../../types';

interface Props {
  canEdit: boolean;
}

export function TeamsTab({ canEdit }: Props) {
  const { teams, users, addTeam, updateTeam, deleteTeam, addToast } = useAppStore();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  return (
    <div>
      <div className="flex justify-end mb-3">
        {canEdit && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> 新規作成
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <EmptyState icon="🏢" title="チームがありません" />
      ) : (
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
                    {members.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {members.join(', ')}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditTeam(team)}
                        className="px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> 編集
                      </button>
                      <button
                        onClick={() => { setDeleteId(team.id); setDeleteInput(''); }}
                        className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Team Modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="チームを作成"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                if (!form.name.trim()) return;
                addTeam({ name: form.name, description: form.description, managerIds: [], memberIds: [] });
                setShowNew(false);
                setForm({ name: '', description: '' });
                addToast({ type: 'success', message: 'チームを作成しました' });
              }}
              disabled={!form.name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50"
            >
              作成する
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
        </div>
      </Modal>

      {/* Team Edit Modal */}
      <TeamEditModal
        team={editTeam}
        users={users}
        onClose={() => setEditTeam(null)}
        onSave={(teamId, updates) => {
          updateTeam(teamId, updates);
          addToast({ type: 'success', message: 'チーム情報を更新しました' });
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteTeam(deleteId!); addToast({ type: 'info', message: 'チームを削除しました' }); }}
        title="チームを削除しますか？"
        message={`「${teams.find(t => t.id === deleteId)?.name}」を削除します。メンバーはチームから外れます（ユーザー自体は削除されません）。`}
        confirmLabel="削除する"
        requireInput={teams.find(t => t.id === deleteId)?.name}
        inputValue={deleteInput}
        onInputChange={setDeleteInput}
      />
    </div>
  );
}
