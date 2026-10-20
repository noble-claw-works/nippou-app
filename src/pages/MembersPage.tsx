import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { useAppStore } from '../store';
import {
  RELATION_LABELS,
  GENDER_LABELS,
  calcAge,
} from './HouseholdDetailPage/helpers';
import type { PersonRelation } from '../types';

/**
 * 構成員タブ（新設・表示専用）
 * 全世帯の構成員を 1 リストで横断表示する。追加・編集の口は持たない。
 * 入力は世帯詳細に集約されるため、行の「詳細」から所属世帯へ遷移する。
 */
export function MembersPage() {
  const navigate = useNavigate();
  const { persons, customers, users } = useAppStore();
  const [search, setSearch] = useState('');
  const [relationFilter, setRelationFilter] = useState<'all' | PersonRelation>('all');

  const householdById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );
  const userById = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  const rows = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return persons
      .map((p) => {
        const household = householdById.get(p.householdId);
        const ownerName = household?.primaryUserId
          ? userById.get(household.primaryUserId)?.name ?? '-'
          : '-';
        return {
          person: p,
          householdName: household?.name ?? '-',
          ownerName,
        };
      })
      .filter((r) => {
        if (relationFilter !== 'all' && r.person.relation !== relationFilter) {
          return false;
        }
        if (!kw) return true;
        return (
          r.person.name.toLowerCase().includes(kw) ||
          (r.person.kana ?? '').toLowerCase().includes(kw) ||
          r.householdName.toLowerCase().includes(kw)
        );
      });
  }, [persons, householdById, userById, search, relationFilter]);

  const relationOptions = Object.entries(RELATION_LABELS) as [
    PersonRelation,
    string,
  ][];

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">👥 構成員</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            全世帯の構成員 {persons.length} 名（表示専用。追加・編集は世帯詳細から）
          </p>
        </div>
      </div>

      {/* 検索・絞り込み */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="氏名・世帯名で検索"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={relationFilter}
          onChange={(e) =>
            setRelationFilter(e.target.value as 'all' | PersonRelation)
          }
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">続柄：すべて</option>
          {relationOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* 一覧テーブル */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium whitespace-nowrap">氏名</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">所属世帯</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">続柄</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">性別</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">
                  生年月日（年齢）
                </th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">職業</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">主担当</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-gray-400"
                  >
                    該当する構成員がいません
                  </td>
                </tr>
              ) : (
                rows.map(({ person, householdName, ownerName }) => {
                  const age = person.birthDate ? calcAge(person.birthDate) : '';
                  return (
                    <tr
                      key={person.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                        {person.name}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {householdName}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {RELATION_LABELS[person.relation] ?? person.relation}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {person.gender ? GENDER_LABELS[person.gender] : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {person.birthDate
                          ? `${person.birthDate}${age ? `（${age}）` : ''}`
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {person.occupation || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {ownerName}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${person.householdId}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                        >
                          <Eye className="w-3 h-3" />
                          詳細
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
