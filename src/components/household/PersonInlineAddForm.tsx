// PersonInlineAddForm.tsx — 世帯員（構成員）のインライン追加フォーム
// PersonsPane（世帯一覧の②構成員ペイン）と新規案件作成①ペインで共用する。
// 11/08 指示書 S1 で PersonsPane から中身を変えずに切り出した。

import { useState } from 'react';
import { useAppStore } from '../../store';
import type { PersonRelation } from '../../types';

const RELATION_OPTIONS: { value: PersonRelation; label: string }[] = [
  { value: 'head', label: '世帯主' },
  { value: 'spouse', label: '配偶者' },
  { value: 'child', label: '子' },
  { value: 'parent', label: '親' },
  { value: 'sibling', label: '兄弟姉妹' },
  { value: 'other', label: 'その他' },
];

interface AddPersonForm {
  name: string;
  relation: PersonRelation;
  annualIncome: string; // 入力欄は文字列、保存時に数値変換
}

interface PersonInlineAddFormProps {
  householdId: string;
  /** 見出し（既定: 構成員を追加） */
  title?: string;
  /** 続柄の初期値（既定: spouse） */
  defaultRelation?: PersonRelation;
  /** 追加成功時に呼ぶ（フォームを閉じる用） */
  onDone: () => void;
  /** キャンセル時に呼ぶ（省略時は onDone） */
  onCancel?: () => void;
}

export function PersonInlineAddForm({
  householdId,
  title = '構成員を追加',
  defaultRelation = 'spouse',
  onDone,
  onCancel,
}: PersonInlineAddFormProps) {
  const { addPerson, addToast } = useAppStore();
  const defaultForm: AddPersonForm = { name: '', relation: defaultRelation, annualIncome: '' };
  const [form, setForm] = useState<AddPersonForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    if (!householdId) return;
    if (!form.name.trim()) {
      addToast({ type: 'error', message: '名前を入力してください' });
      return;
    }
    setSubmitting(true);
    try {
      const incomeNum = form.annualIncome ? Number(form.annualIncome) : undefined;
      addPerson(householdId, {
        name: form.name.trim(),
        relation: form.relation,
        annualIncome: incomeNum && !isNaN(incomeNum) ? incomeNum : undefined,
        memo: '',
      });
      addToast({ type: 'success', message: `${form.name.trim()} を追加しました` });
      setForm(defaultForm);
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-3 py-3 border-b border-blue-100 bg-blue-50">
      <p className="text-xs font-semibold text-blue-700 mb-2">{title}</p>
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="例: 山田 花子"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">続柄</label>
          <div className="flex flex-wrap gap-1">
            {RELATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, relation: opt.value }))}
                className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                  form.relation === opt.value
                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-0.5">
            年収（万円）
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={form.annualIncome}
              onChange={e => setForm(f => ({ ...f, annualIncome: e.target.value }))}
              placeholder="例: 500"
              min={0}
              className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-xs text-gray-500">万円</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setForm(defaultForm); (onCancel ?? onDone)(); }}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!form.name.trim() || submitting}
            className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}
