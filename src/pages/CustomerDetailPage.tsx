import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Tag, Edit } from 'lucide-react';
import { useAppStore } from '../store';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BLOCK_EMOJIS, BLOCK_LABELS } from '../utils';

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { customers, users, reports, currentRole, updateCustomer, deactivateCustomer, addToast } = useAppStore();
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const customer = customers.find(c => c.id === customerId);
  if (!customer) return <div className="px-4 py-8"><EmptyState icon="🔍" title="顧客が見つかりません" /></div>;

  const primaryUser = users.find(u => u.id === customer.primaryUserId);
  const relatedReports = reports.filter(r => r.blocks.some(b => b.customerId === customerId));

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

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 直近の対応履歴 ({relatedReports.length}件)</h2>
        {relatedReports.length === 0 ? (
          <p className="text-sm text-gray-400">対応履歴がありません</p>
        ) : (
          <div className="space-y-2">
            {relatedReports.slice(0, 10).map(report => {
              const blocks = report.blocks.filter(b => b.customerId === customerId);
              return (
                <div key={report.id} onClick={() => navigate(`/reports/${report.date}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs text-gray-500 w-24">{report.date}</span>
                  <div className="flex gap-2">
                    {blocks.map(b => (
                      <span key={b.id} className="text-xs text-gray-700">
                        {BLOCK_EMOJIS[b.type]} {b.title || BLOCK_LABELS[b.type]}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog open={deactivating} onClose={() => setDeactivating(false)}
        onConfirm={() => { deactivateCustomer(customer.id); addToast({ type: 'info', message: '無効化しました' }); navigate('/customers'); }}
        title="顧客を無効化しますか？"
        message={`「${customer.name}」を無効化します。`}
        confirmLabel="無効化する" />
    </div>
  );
}
