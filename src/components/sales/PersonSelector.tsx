// =====================================================
// PersonSelector — 対象者切替ドロップダウン
// =====================================================
import type { User } from '../../types';

interface Props {
  users: User[];
  selectedUserId: string;
  onChange: (userId: string) => void;
  label?: string;
}

export function PersonSelector({ users, selectedUserId, onChange, label = '対象者' }: Props) {
  if (users.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 whitespace-nowrap">{label}</label>
      <select
        value={selectedUserId}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
