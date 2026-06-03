import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag, Edit, Clock, User as UserIcon, FileText, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '../store';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
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
  const { customers, users, reports, currentRole, updateCustomer, deactivateCustomer, addToast } = useAppStore();
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const customer = customers.find(c => c.id === customerId);
  if (!customer) return <div className="px-4 py-8"><EmptyState icon="🔍" title="顧客が見つかりません" /></div>;

  const primaryUser = users.find(u => u.id === customer.primaryUserId);

  // 対応履歴: 該顧客 customerId を含むすべての block を「1 件 = 1 ブロック」単位で平めて、新しい順 (date desc → startTime desc) に並べる。
  const historyEntries = useMemo(() => {
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
  }, [reports, customerId]);

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

      {/* 対応履歴 */}
      <section id="history" className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">📅 対応履歴 ({historyEntries.length}件)</h2>
          {historyEntries.length > 0 && (
            <span className="text-xs text-gray-400">新しい順</span>
          )}
        </div>
        {historyEntries.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">対応履歴がありません</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {historyEntries.map(({ reportId, reportDate, reportUserId, block }) => {
              const handler = users.find(u => u.id === reportUserId);
              const hasResult = !!(block.result || block.proposal || block.collected || block.nextAppointment);
              return (
                <li key={block.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/reports/${reportDate}`)}
                    className="w-full text-left py-3 px-2 -mx-2 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`${reportDate} ${block.startTime}〜${block.endTime} ${BLOCK_LABELS[block.type]} の日報を開く`}
                  >
                    {/* 1 行目: 日付 ・ 時刻 ・ 種別バッジ ・ 担当者 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {reportDate}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {block.startTime || '--:--'} 〜 {block.endTime || '--:--'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-700">
                        {BLOCK_EMOJIS[block.type]} {BLOCK_LABELS[block.type]}
                      </span>
                      {handler && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <UserIcon className="w-3.5 h-3.5" />
                          {handler.name}
                        </span>
                      )}
                      {!block.isActual && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]">予定</span>
                      )}
                    </div>

                    {/* 2 行目: タイトル */}
                    {block.title && (
                      <p className="mt-1 text-sm font-medium text-gray-900">{block.title}</p>
                    )}

                    {/* 3 行目: メモ */}
                    {block.memo && (
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{block.memo}</p>
                    )}

                    {/* 4 行目以降: 訪問結果詳細 */}
                    {hasResult && (
                      <div className="mt-2 space-y-1 text-xs">
                        {block.result && (
                          <div className="flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
                            <span className="text-gray-700"><span className="text-gray-500">結果: </span>{block.result}</span>
                          </div>
                        )}
                        {block.proposal && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-purple-600 flex-shrink-0">💡</span>
                            <span className="text-gray-700"><span className="text-gray-500">提案: </span>{block.proposal}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
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
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
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
