// PersonEditModal.tsx — 世帯員 追加/編集モーダル (Phase 1)

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { FormField } from '../ui/EmptyState';
import type { Person, PersonRelation, PersonGender } from '../../types';

const RELATION_LABELS: Record<PersonRelation, string> = {
  head: '世帯主',
  spouse: '配偶者',
  child: '子',
  parent: '親',
  sibling: '兄弟姉妹',
  other: 'その他',
};

const GENDER_LABELS: Record<PersonGender, string> = {
  M: '男性',
  F: '女性',
  other: 'その他',
};

interface PersonEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Person, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => void;
  initial?: Partial<Person>;
  title?: string;
}

export function PersonEditModal({ open, onClose, onSave, initial, title = '世帯員を追加' }: PersonEditModalProps) {
  const [form, setForm] = useState<Omit<Person, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>>({
    name: '',
    kana: '',
    relation: 'head',
    birthDate: '',
    gender: undefined,
    occupation: '',
    smoker: false,
    healthNotes: '',
    memo: '',
    ...initial,
  });

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <FormField label="氏名" required>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="例: 田中 太郎"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FormField>

        <FormField label="かな">
          <input
            value={form.kana ?? ''}
            onChange={e => setForm(f => ({ ...f, kana: e.target.value }))}
            placeholder="例: たなか たろう"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </FormField>

        <FormField label="続柄">
          <select
            value={form.relation}
            onChange={e => setForm(f => ({ ...f, relation: e.target.value as PersonRelation }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {(Object.keys(RELATION_LABELS) as PersonRelation[]).map(r => (
              <option key={r} value={r}>{RELATION_LABELS[r]}</option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="生年月日">
            <input
              type="date"
              value={form.birthDate ?? ''}
              onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </FormField>

          <FormField label="性別">
            <select
              value={form.gender ?? ''}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value ? (e.target.value as PersonGender) : undefined }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">未選択</option>
              {(Object.keys(GENDER_LABELS) as PersonGender[]).map(g => (
                <option key={g} value={g}>{GENDER_LABELS[g]}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="職業">
          <input
            value={form.occupation ?? ''}
            onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
            placeholder="例: 会社員、自営業、無職"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </FormField>

        <FormField label="喫煙">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.smoker ?? false}
              onChange={e => setForm(f => ({ ...f, smoker: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">喫煙あり</span>
          </label>
        </FormField>

        <FormField label="既往症・健康メモ">
          <textarea
            value={form.healthNotes ?? ''}
            onChange={e => setForm(f => ({ ...f, healthNotes: e.target.value }))}
            rows={2}
            placeholder="例: 高血圧、花粉症"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          />
        </FormField>

        <FormField label="メモ">
          <textarea
            value={form.memo}
            onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={!form.name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            保存
          </button>
        </div>
      </div>
    </Modal>
  );
}
