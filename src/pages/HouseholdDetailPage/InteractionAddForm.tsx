// =====================================================
// InteractionAddForm — 対応記録追加フォーム
// =====================================================
import { useState } from "react";
import { Phone, Store, MapPin, Mail, MoreHorizontal, X } from "lucide-react";
import type { InteractionKind, Person } from "../../types";
import { INTERACTION_KIND_LABEL } from "../../types";

interface InteractionAddFormProps {
  persons: Person[];
  onSave: (data: {
    kind: InteractionKind;
    occurredAt: string;
    personId?: string;
    summary: string;
    nextAppointment?: string;
  }) => void;
  onCancel: () => void;
  /** レスポンシブでモバイル/デスクトップの2箭所に描画されるため、id重複を避ける prefix */
  idPrefix?: string;
  /** Modal 内に置く場合は Modal 側にタイトル/閉じるXがあるのでフォーム自身のヘッダを非表示にする */
  hideHeader?: boolean;
}

const KIND_OPTIONS: {
  value: InteractionKind;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "phone", icon: Phone },
  { value: "reception", icon: Store },
  { value: "visit", icon: MapPin },
  { value: "email", icon: Mail },
  { value: "other", icon: MoreHorizontal },
];

import React from "react";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function InteractionAddForm({
  persons,
  onSave,
  onCancel,
  idPrefix = "interaction",
  hideHeader = false,
}: InteractionAddFormProps) {
  const idOccurredAt = `${idPrefix}-occurred-at`;
  const idPerson = `${idPrefix}-person`;
  const idSummary = `${idPrefix}-summary`;
  const idNextAppointment = `${idPrefix}-next-appointment`;
  const [kind, setKind] = useState<InteractionKind>("phone");
  const [occurredAt, setOccurredAt] = useState(today());
  const [personId, setPersonId] = useState("");
  const [summary, setSummary] = useState("");
  const [nextAppointment, setNextAppointment] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError("対応内容を入力してください");
      return;
    }
    if (!occurredAt) {
      setError("対応日を入力してください");
      return;
    }
    onSave({
      kind,
      occurredAt,
      personId: personId || undefined,
      summary: summary.trim(),
      nextAppointment: nextAppointment || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        hideHeader
          ? "space-y-4"
          : "bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm"
      }
    >
      {!hideHeader && (
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-800">
            対応記録を追加
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 種別 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          種別
        </label>
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                kind === value
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {INTERACTION_KIND_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {/* 対応日 */}
      <div>
        <label
          htmlFor={idOccurredAt}
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          対応日 <span className="text-red-500">*</span>
        </label>
        <input
          id={idOccurredAt}
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 対象者（任意） */}
      {persons.length > 0 && (
        <div>
          <label
            htmlFor={idPerson}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            対象者 <span className="text-gray-400 font-normal">(任意)</span>
          </label>
          <select
            id={idPerson}
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択なし</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 対応内容 */}
      <div>
        <label
          htmlFor={idSummary}
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          対応内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id={idSummary}
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            if (error) setError("");
          }}
          rows={3}
          placeholder="対応内容を入力してください"
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
        />
      </div>

      {/* 次回予定（任意） */}
      <div>
        <label
          htmlFor={idNextAppointment}
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          次回予定日 <span className="text-gray-400 font-normal">(任意)</span>
        </label>
        <input
          id={idNextAppointment}
          type="date"
          value={nextAppointment}
          onChange={(e) => setNextAppointment(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          保存する
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
