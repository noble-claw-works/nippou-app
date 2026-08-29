import { useState } from "react";
import { useAppStore } from "../../store";
import type { Customer } from "../../types";

interface CustomerEditFormProps {
  initial: Customer;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}

export function CustomerEditForm({
  initial,
  onSave,
  onCancel,
}: CustomerEditFormProps) {
  const [form, setForm] = useState<Partial<Customer>>({ ...initial });
  const { users } = useAppStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          世帯名
        </label>
        <input
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          エリア
        </label>
        <input
          value={form.area ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          主担当
        </label>
        <select
          value={form.primaryUserId ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, primaryUserId: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {users
            .filter((u) => u.status === "active")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          家族構成メモ
        </label>
        <textarea
          value={form.familyMemo ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, familyMemo: e.target.value }))
          }
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メモ
        </label>
        <textarea
          value={form.memo ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name?.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </div>
  );
}
