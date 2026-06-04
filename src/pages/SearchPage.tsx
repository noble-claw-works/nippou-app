import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS, calcMiniTimelineSegments, formatDate } from '../utils';
import type { ReportStatus } from '../types';

const ALL_STATUSES: ReportStatus[] = ['planning', 'in_progress', 'submitted', 'confirmed'];

function parseStatusFilter(raw: string | null): ReportStatus[] {
  if (!raw) return ALL_STATUSES;
  const parts = raw.split(',').map(s => s.trim()).filter((s): s is ReportStatus =>
    ALL_STATUSES.includes(s as ReportStatus));
  return parts.length > 0 ? parts : ALL_STATUSES;
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatuses = parseStatusFilter(searchParams.get('status'));
  const autoSearch = searchParams.get('auto') === '1';
  const { reports, users, customers, currentRole, currentUserId } = useAppStore();
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ReportStatus[]>(initialStatuses);
  const [authorId, setAuthorId] = useState('');
  const [searched, setSearched] = useState(autoSearch);

  // MGR-2: URL クエリで ?status=submitted&auto=1 が渡されたら初期検索を実行して一覧を表示
  useEffect(() => {
    if (autoSearch) {
      setSearched(true);
    }
  }, [autoSearch]);

  const toggleStatus = (s: ReportStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const visibleUsers = currentRole === 'executive' ? users
    : currentRole === 'manager' ? users.filter(u => u.role === 'general')
    : users.filter(u => u.id === currentUserId);

  const filteredReports = reports.filter(r => {
    if (currentRole === 'general' && r.userId !== currentUserId) return false;
    if (currentRole === 'manager') {
      const viewer = users.find(u => u.id === currentUserId);
      const author = users.find(u => u.id === r.userId);
      if (!viewer || !author) return false;
      if (!viewer.teamIds.some(tid => author.teamIds.includes(tid)) && r.userId !== currentUserId) return false;
    }
    if (!selectedStatuses.includes(r.status)) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (authorId && r.userId !== authorId) return false;
    if (query) {
      const q = query.toLowerCase();
      const hasBlockMatch = r.blocks.some(b => b.title.toLowerCase().includes(q));
      const hasCustomerMatch = r.blocks.some(b => {
        const c = customers.find(c => c.id === b.customerId);
        return c?.name.toLowerCase().includes(q);
      });
      if (!hasBlockMatch && !hasCustomerMatch && !r.mainTheme.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const STATUS_LABELS: Record<ReportStatus, string> = {
    planning: '予定入力中', in_progress: '実績入力中', submitted: '提出済み', confirmed: '承認済み',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">🔍 検索</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearched(true)}
              placeholder="キーワードで検索..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => setSearched(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            検索
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">期間（開始）</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">期間（終了）</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['planning', 'in_progress', 'submitted', 'confirmed'] as ReportStatus[]).map(s => (
            <button key={s} onClick={() => toggleStatus(s)}
              className={`px-3 py-1 text-xs rounded-full border ${selectedStatuses.includes(s) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              {selectedStatuses.includes(s) ? '☑' : '☐'} {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {currentRole !== 'general' && (
          <select value={authorId} onChange={e => setAuthorId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
            <option value="">すべてのユーザー</option>
            {visibleUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <div className="flex justify-end mt-2">
          <button onClick={() => { setQuery(''); setDateFrom(''); setDateTo(''); setAuthorId(''); setSelectedStatuses(['planning','in_progress','submitted','confirmed']); setSearched(false); }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <X className="w-3 h-3" /> リセット
          </button>
        </div>
      </div>

      {searched && (
        <>
          <p className="text-sm text-gray-500 mb-3">検索結果 ({filteredReports.length} 件)</p>
          {filteredReports.length === 0 ? (
            <EmptyState icon="🔍" title="条件に一致する日報がありません"
              action={{ label: '条件をリセット', onClick: () => { setSearched(false); setSelectedStatuses(['planning','in_progress','submitted','confirmed']); } }} />
          ) : (
            <div className="space-y-3">
              {filteredReports.slice(0, 20).map(report => {
                const author = users.find(u => u.id === report.userId);
                const visitedCustomers = report.blocks
                  .filter(b => b.customerId)
                  .map(b => customers.find(c => c.id === b.customerId)?.name ?? '不明')
                  .filter(Boolean);
                // ミニタイムライン (MGR-3): 08:00〜20:00 を 100% にして block を帯形式で描画
                const sortedBlocks = [...report.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
                const segs = calcMiniTimelineSegments(sortedBlocks); // 1:1 対応保証
                return (
                  <div key={report.id}
                    onClick={() => navigate(`/reports/${report.date}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all">
                    {/* LIST-1: 氏名を先頭・大きく強調 */}
                    {author && currentRole !== 'general' && (
                      <p className="text-base font-bold text-gray-900 mb-1.5">{author.name}</p>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{formatDate(report.date)}</span>
                        <StatusBadge status={report.status} />
                      </div>
                      <span className="text-xs text-blue-600 hover:underline">開く</span>
                    </div>

                    {/* ミニタイムライン帯 */}
                    {sortedBlocks.length > 0 ? (
                      <div className="mt-2">
                        <div
                          className="relative h-7 bg-gray-50 rounded-md overflow-hidden"
                          role="img"
                          aria-label={`タイムライン ${sortedBlocks.length}ブロック`}
                        >
                          {sortedBlocks.map((b, i) => {
                            const seg = segs[i];
                            if (seg.hidden) return null;
                            const color = BLOCK_COLORS[b.type].split(' ').find(c => c.startsWith('bg-')) ?? 'bg-blue-100';
                            return (
                              <div
                                key={b.id}
                                className={`absolute top-0 bottom-0 ${color} border-r border-white/60 flex items-center justify-center text-[10px] overflow-hidden`}
                                style={{ left: `${seg.leftPct}%`, width: `${Math.max(seg.widthPct, 1.5)}%` }}
                                title={`${b.startTime}–${b.endTime} ${b.title || BLOCK_LABELS[b.type]}`}
                              >
                                <span className="truncate" aria-hidden="true">{BLOCK_EMOJIS[b.type]}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 tabular-nums">
                          <span>8:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">ブロック未記録</p>
                    )}

                    {visitedCustomers.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">👥 {visitedCustomers.join(', ')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
