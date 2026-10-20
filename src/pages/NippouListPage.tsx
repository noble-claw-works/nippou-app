// =====================================================
// NippouListPage — D3 日報一覧（検索・フィルタ・ロール別可視範囲）
// - general: 自分の日報のみ
// - manager / executive / admin: 全員の日報
// - フィルタ: 日付範囲・作成者・ステータス・キーワード
// - 行クリックで /reports/:date へ遷移
// =====================================================
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate } from '../utils';
import type { ReportStatus } from '../types';

const STATUS_LABELS: Record<ReportStatus, string> = {
  planning: '予定作成中',
  in_progress: '実績入力中',
  submitted: '提出済み',
  confirmed: '確認済み',
};

const ALL_STATUSES: ReportStatus[] = ['planning', 'in_progress', 'submitted', 'confirmed'];

export function NippouListPage() {
  const navigate = useNavigate();
  const { reports, users, currentRole, currentUserId } = useAppStore();

  // ─── フィルタ状態 ──────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // ─── ロール別可視範囲 ─────────────────────────────────────────────────────
  const isManagerOrAbove =
    currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin';

  // general は自分の日報のみ
  const scopedReports = useMemo(() => {
    if (!isManagerOrAbove) {
      return reports.filter((r) => r.userId === currentUserId);
    }
    return reports;
  }, [reports, isManagerOrAbove, currentUserId]);

  // ─── フィルタ適用 ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return scopedReports
      .filter((r) => {
        if (filterUserId && r.userId !== filterUserId) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterDateFrom && r.date < filterDateFrom) return false;
        if (filterDateTo && r.date > filterDateTo) return false;
        if (keyword.trim()) {
          const kw = keyword.trim().toLowerCase();
          const user = users.find((u) => u.id === r.userId);
          const haystack = [
            r.date,
            user?.name ?? '',
            STATUS_LABELS[r.status],
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [scopedReports, filterUserId, filterStatus, filterDateFrom, filterDateTo, keyword, users]);

  // 上長・admin: 作成者選択肢
  const userOptions = useMemo(() => {
    if (!isManagerOrAbove) return [];
    const ids = new Set(scopedReports.map((r) => r.userId));
    return users.filter((u) => ids.has(u.id));
  }, [scopedReports, users, isManagerOrAbove]);

  const handleRowClick = (date: string, userId: string) => {
    const path =
      userId !== currentUserId
        ? `/reports/${date}?user=${userId}`
        : `/reports/${date}`;
    navigate(path);
  };

  const clearFilters = () => {
    setKeyword('');
    setFilterUserId('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasFilter =
    keyword || filterUserId || filterStatus || filterDateFrom || filterDateTo;

  return (
    <div className="w-full px-3 sm:px-4 py-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-800">📋 日報一覧</h2>
        <span className="text-xs text-gray-500">{filtered.length} 件</span>
      </div>

      {/* フィルタバー */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
        {/* キーワード検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="日付・担当者名・ステータスで検索"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 作成者（上長以上のみ） */}
          {isManagerOrAbove && (
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべての担当者</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* ステータス */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべてのステータス</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {/* 日付From */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="開始日"
          />
          <span className="text-xs text-gray-400 self-center">〜</span>
          {/* 日付To */}
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="終了日"
          />

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* 一覧テーブル */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
          <p className="text-4xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">
            {hasFilter ? '条件に合う日報が見つかりません' : '日報がありません'}
          </p>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              フィルタをクリア
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* テーブルヘッダー（デスクトップ） */}
          <div className="hidden sm:grid border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50"
            style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
            <span>日付</span>
            {isManagerOrAbove && <span>担当者</span>}
            <span>ステータス</span>
            <span />
          </div>

          {/* 行 */}
          <ul role="list" className="divide-y divide-gray-100">
            {filtered.map((report) => {
              const user = users.find((u) => u.id === report.userId);
              return (
                <li key={`${report.id}`}>
                  <button
                    type="button"
                    onClick={() => handleRowClick(report.date, report.userId)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                  >
                    {/* 日付 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formatDate(report.date)}
                      </p>
                      {/* モバイル: 担当者とステータスを日付の下に */}
                      <div className="sm:hidden flex items-center gap-2 mt-0.5">
                        {isManagerOrAbove && user && (
                          <span className="text-xs text-gray-500">{user.name}</span>
                        )}
                        <StatusBadge status={report.status} />
                      </div>
                    </div>

                    {/* 担当者（デスクトップ・上長以上のみ） */}
                    {isManagerOrAbove && (
                      <div className="hidden sm:block flex-1 min-w-0">
                        <span className="text-sm text-gray-700 truncate">
                          {user?.name ?? '—'}
                        </span>
                      </div>
                    )}

                    {/* ステータス（デスクトップ） */}
                    <div className="hidden sm:block flex-1">
                      <StatusBadge status={report.status} />
                    </div>

                    {/* シェブロン */}
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
