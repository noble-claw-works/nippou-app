import { useState } from "react";
import { useAppStore } from "../../store";
import { FormField } from "../../components/ui/EmptyState";
import type { Customer, CustomerType } from "../../types";
import { TYPE_LABELS } from "./constants";
import { ChannelSelect } from "../HouseholdBatchEntryPage/ChannelSelect";

export function CustomerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Customer>;
  onSave: (data: Partial<Customer>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<Customer>>({
    name: "",
    type: "individual",
    area: "",
    tags: [],
    memo: "",
    channelId: undefined,
    ...initial,
  });
  const [tagInput, setTagInput] = useState("");
  const { users } = useAppStore();

  const addTag = () => {
    if (tagInput.trim() && !(form.tags ?? []).includes(tagInput.trim())) {
      setForm((f) => ({ ...f, tags: [...(f.tags ?? []), tagInput.trim()] }));
      setTagInput("");
    }
  };

  return (
    <div className="space-y-4">
      <FormField label="顧客名" required>
        <input
          value={form.name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="区分">
        <div className="flex gap-2">
          {(["individual", "corporate", "prospect"] as CustomerType[]).map(
            (t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`px-3 py-1.5 text-xs rounded-lg border ${form.type === t ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 text-gray-600"}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ),
          )}
        </div>
      </FormField>
      <FormField label="エリア">
        <input
          value={form.area ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
      <FormField label="主担当">
        <select
          value={form.primaryUserId ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, primaryUserId: e.target.value }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          {users
            .filter((u) => u.status === "active")
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
      </FormField>
      <FormField label="タグ">
        <div className="flex gap-2 mb-2 flex-wrap">
          {(form.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {tag}
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    tags: f.tags?.filter((t) => t !== tag),
                  }))
                }
                className="text-blue-400 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="タグを入力してEnter"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          />
          <button
            onClick={addTag}
            className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            追加
          </button>
        </div>
      </FormField>
      <FormField label="チャネル">
        <ChannelSelect
          channelId={form.channelId}
          onChange={(id) => setForm((f) => ({ ...f, channelId: id || undefined }))}
        />
      </FormField>
      <FormField label="メモ">
        <textarea
          value={form.memo ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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
