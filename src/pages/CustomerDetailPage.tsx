import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag, Edit, Clock, User as UserIcon, FileText, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '../store';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../utils';

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // URL ハッシュ #history で履歴セクションへスクロール
  useEffect(() => {
    if (location.hash === '#history') {
      const el = document.getElementById('history');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);
  const { customers, users, reports, currentRole, deactivateCustomer, addToast } = useAppStore();
  // showEdit: 顧客編集モーダル表示フラグ (編集UIは将来実装)
  const [, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const customer = customers.find(c => c.id === customerId);

  const primaryUser = useMemo(
    () => users.find(u => u.id === customer?.primaryUserId),
    [users, customer?.primaryUserId]
  );

  // 対応履歴: 該顧客 customerId を含むすべての block を「1 件 = 1 ブロック」単位で平めて、新しい順 (date desc → startTime desc) に並べる。
  const historyEntries = useMemo(() => {
    if (!customer) return [];
    const entries: Array<{
      reportId: string;
      reportDate: string;
      reportUserId: string;
      block: typeof reports[number]['blocks'][number];
    }> = [];
    for (const r of reports) {
      for (const b of r.blocks) {
        if (b.customerId === customerId) {
          entries.push({ reportId: r.id, reportDate: r.date, reportUserId: r.userId, block: b });
        }
      }
    }
    entries.sort((a, b) => {
      if (a.reportDate !== b.reportDate) return a.reportDate < b.reportDate ? 1 : -1;
      return (a.block.startTime || '') < (b.block.startTime || '') ? 1 : -1;
    });
    return entries;
  }, [reports, customerId, customer]);

  if (!customer) return <div className="px-4 py-8"><EmptyState icon="🔍" title="顧客が見つかりません" /></div>;

  const TYPE_LABELS = { individual: '個人', corporate: '法人', prospect: '見込み' };
  const canEdit = currentRole === 'manager' || currentRole === 'admin';
  const canDeactivate = currentRole === 'admin';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <button onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> 一覧へ
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">👤 {customer.name}</h1>
              {customer.isFavorite && <span>⭐</span>}
              {customer.status === 'inactive' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">無効</span>}
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[customer.type]}</span>
          </div>
          <div className="flex gap-2">
            {canEdit && <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Edit className="w-4 h-4" /> 編集
            </button>}
            {canDeactivate && customer.status === 'active' && (
              <button onClick={() => setDeactivating(true)}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                無効化
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">エリア:</span>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{customer.area || '未設定'}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">主担当:</span>
            <p className="mt-0.5">{primaryUser?.name ?? '未設定'}</p>
          </div>
          <div>
            <span className="text-gray-500">最終接触:</span>
            <p className="mt-0.5">{customer.lastContactDate ?? '未記録'}</p>
          </div>
          <div>
            <span className="text-gray-500">次回AP:</span>
            <p className="mt-0.5 text-blue-600">{customer.nextAppointment ?? '未設定'}</p>
          </div>
        </div>

        {customer.tags.length > 0 && (
          <div className="mt-4">
            <span className="text-xs text-gray-500 block mb-1">タグ:</span>
            <div className="flex gap-1 flex-wrap">
              {customer.tags.map(tag => (
                <span key={tag} className="flex items-center gap-0.5 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {customer.memo && (
          <div className="mt-4">
            <span className="text-xs text-gray-500 block mb-1">メモ:</span>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{customer.memo}</p>
          </div>
        )}
      </div>

      {/* 対応履歴 — タイムライン型カードレイアウト (CUS-3) */}
      <section id="history" className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">📅 対応履歴 ({historyEntries.length}件)</h2>
          {historyEntries.length > 0 && (
            <span className="text-xs text-gray-400">新しい順</span>
          )}
        </div>
        {historyEntries.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">対応履歴がありません</p>
        ) : (
          <div className="relative pl-6">
            {/* 垂直タイムライン軸 */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent" aria-hidden="true" />
            <ul className="space-y-3">
              {historyEntries.map(({ reportDate, reportUserId, block }) => {
                const handler = users.find(u => u.id === reportUserId);
                const hasResult = !!(block.result || block.proposal || block.collected || block.nextAppointment);
                const typeAccent: Record<string, string> = {
                  visit: 'border-l-blue-400 bg-blue-50/30',
                  office: 'border-l-gray-400 bg-gray-50/30',
                  phone: 'border-l-amber-400 bg-amber-50/30',
                  travel: 'border-l-emerald-400 bg-emerald-50/30',
                  break: 'border-l-pink-300 bg-pink-50/30',
                  meeting: 'border-l-purple-400 bg-purple-50/30',
                  lunch: 'border-l-orange-400 bg-orange-50/30',
                };
                return (
                  <li key={block.id} className="relative">
                    {/* タイムライン軸上のドット */}
                    <span
                      className="absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={() => navigate(`/reports/${reportDate}`)}
                      className={`block w-full text-left rounded-lg border border-gray-200 border-l-4 ${typeAccent[block.type] ?? 'border-l-gray-300 bg-gray-50/30'} p-3 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      aria-label={`${reportDate} ${block.startTime}〜${block.endTime} ${BLOCK_LABELS[block.type]} の日報を開く`}
                    >
                      {/* ヘッダー: 日付と時刻を主要要素として並べる */}
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                          {reportDate}
                        </span>
                        <span className="text-xs text-gray-600 tabular-nums inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {block.startTime || '--:--'} 〜 {block.endTime || '--:--'}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                          {BLOCK_EMOJIS[block.type]} {BLOCK_LABELS[block.type]}
                        </span>
                      </div>

                      {/* タイトル */}
                      {block.title && (
                        <p className="text-sm font-medium text-gray-900 mb-1">{block.title}</p>
                      )}

                      {/* メモ */}
                      {block.memo && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2 leading-relaxed">{block.memo}</p>
                      )}

                      {/* 訪問結果グリッド */}
                      {hasResult && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {block.result && (
                            <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                              <FileText className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="block text-[10px] text-gray-500 uppercase tracking-wide">結果</span>
                                <span className="text-gray-800">{block.result}</span>
                              </div>
                            </div>
                          )}
                          {block.proposal && (
                            <div className="flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100">
                              <span className="text-purple-600 flex-shrink-0">💡</span>
                              <div className="min-w-0">
                                <span className="block text-[10px] text-gray-500 uppercase tracking-wide">提案</span>
                                <span className="text-gray-800">{block.proposal}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* フッター: 担当者 ・ バッジ類 */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        {handler && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <UserIcon className="w-3 h-3 text-gray-400" />
                            {handler.name}
                          </span>
                        )}
                        {!block.isActual && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">予定</span>
                        )}
                        {block.collected && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> 集金済
                          </span>
                        )}
                        {block.nextAppointment && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                            📆 次回: {block.nextAppointment}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-blue-600 hover:underline">日報を開く →</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <ConfirmDialog open={deactivating} onClose={() => setDeactivating(false)}
        onConfirm={() => { deactivateCustomer(customer.id); addToast({ type: 'info', message: '無効化しました' }); navigate('/customers'); }}
        title="顧客を無効化しますか？"
        message={`「${customer.name}」を無効化します。`}
        confirmLabel="無効化する" />
    </div>
  );
}
