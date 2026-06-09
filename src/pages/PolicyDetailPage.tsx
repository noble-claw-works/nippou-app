import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, Plus, Shield } from 'lucide-react';
import { useAppStore } from '../store';
import type { PolicyStatus } from '../types';
import { PolicyStatusBadge } from '../components/policy/PolicyStatusBadge';
import { PolicyEditModal } from '../components/policy/PolicyEditModal';
import { CoverageEditModal } from '../components/policy/CoverageEditModal';

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

const PAY_MODE_LABELS: Record<string, string> = {
  monthly: '月払', semi_annual: '半年払', annual: '年払', lump_sum: '一括払',
};

const COVERAGE_TYPE_LABELS: Record<string, string> = {
  death: '死亡', living_benefit: '生前給付', medical_hospital: '入院',
  medical_surgery: '手術', cancer: 'がん', critical_illness: '三大疾病',
  disability: '就業不能', nursing: '介護', savings: '貯蓄/年金',
  liability: '賠償', asset_damage: '物損', other: 'その他',
};

type Tab = 'info' | 'coverages' | 'history' | 'activities';

export function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    policies, policyStatusHistory, customers, persons, users, reports, opportunities,
    deletePolicy, deleteCoverage, changePolicyStatus, activatePolicy, addToast,
    currentRole, currentUserId,
  } = useAppStore();

  const policy = policies.find(p => p.id === id);
  const [tab, setTab] = useState<Tab>('info');
  const [showEdit, setShowEdit] = useState(false);
  const [showAddCoverage, setShowAddCoverage] = useState(false);
  const [editCoverageId, setEditCoverageId] = useState<string | null>(null);
  const [showActivate, setShowActivate] = useState(false);
  const [activatePolicyNumber, setActivatePolicyNumber] = useState('');
  const [activateStartDate, setActivateStartDate] = useState(new Date().toISOString().slice(0, 10));

  if (!policy) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>契約が見つかりません</p>
        <button onClick={() => navigate('/policies')} className="mt-2 text-blue-500 hover:underline text-sm">
          一覧に戻る
        </button>
      </div>
    );
  }

  const household = customers.find(c => c.id === policy.householdId);
  const owner = users.find(u => u.id === policy.ownerId);
  const contractor = persons.find(p => p.id === policy.contractorPersonId);
  const historyEntries = policyStatusHistory
    .filter(h => h.policyId === policy.id)
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));

  // Related activities
  const relatedBlocks = reports
    .flatMap(r => r.blocks.map(b => ({ ...b, reportDate: r.date })))
    .filter(b => b.customerId === policy.householdId);

  // Source Opportunity
  const sourceOpp = policy.sourceOpportunityId
    ? opportunities.find(o => o.id === policy.sourceOpportunityId)
    : null;

  // Edit access
  const canEdit = currentRole === 'admin' || policy.ownerId === currentUserId;

  const handleDelete = () => {
    if (!confirm('この契約を削除しますか？')) return;
    deletePolicy(policy.id);
    navigate('/policies');
    addToast({ type: 'success', message: '契約を削除しました' });
  };

  const handleStatusChange = (newStatus: PolicyStatus) => {
    const note = prompt(`ステータスを「${newStatus}」に変更します。メモを入力してください（省略可）`) ?? '';
    changePolicyStatus(policy.id, newStatus, note || undefined, currentUserId);
    addToast({ type: 'success', message: `ステータスを「${newStatus}」に変更しました` });
  };

  const handleActivate = () => {
    if (!activatePolicyNumber.trim()) {
      addToast({ type: 'error', message: '証券番号を入力してください' });
      return;
    }
    activatePolicy(policy.id, activatePolicyNumber.trim(), activateStartDate, currentUserId);
    addToast({ type: 'success', message: '契約を有効化しました' });
    setShowActivate(false);
  };

  const editCoverage = policy.coverages.find(c => c.id === editCoverageId);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: '📊 基本情報' },
    { key: 'coverages', label: `🛡️ 保障内容 (${policy.coverages.length})` },
    { key: 'history', label: `🔁 ステータス履歴 (${historyEntries.length})` },
    { key: 'activities', label: `📅 関連活動 (${relatedBlocks.length})` },
  ];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/policies')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        契約一覧
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <PolicyStatusBadge status={policy.status} size="md" />
              <span className="text-xs text-gray-500">
                {PRODUCT_CATEGORY_LABELS[policy.productCategory]}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">{policy.productName}</h1>
            <p className="text-sm text-gray-600 mt-0.5">{policy.insurer}</p>
            {policy.policyNumber && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">No. {policy.policyNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">月払</p>
            <p className="text-base font-bold text-gray-900">
              {policy.monthlyPremium > 0
                ? `¥${policy.monthlyPremium.toLocaleString()}`
                : '払済'
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">契約者</p>
            <p className="text-sm font-semibold text-gray-800">{contractor?.name ?? '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">担当</p>
            <p className="text-sm font-semibold text-gray-800">{owner?.name ?? '—'}</p>
          </div>
        </div>

        {/* Status action buttons */}
        {canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            {policy.status === 'pending' && (
              <button
                onClick={() => setShowActivate(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ✅ 有効化 (証券番号設定)
              </button>
            )}
            {policy.status === 'inforce' && (
              <>
                <button
                  onClick={() => handleStatusChange('paid_up')}
                  className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200"
                >
                  💰 払済に変更
                </button>
                <button
                  onClick={() => handleStatusChange('surrendered')}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200"
                >
                  ❌ 解約処理
                </button>
                <button
                  onClick={() => handleStatusChange('matured')}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200"
                >
                  🎉 満期処理
                </button>
              </>
            )}
          </div>
        )}

        {/* Source Opportunity */}
        {sourceOpp && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              元案件:{' '}
              <Link to={`/opportunities/${sourceOpp.id}`} className="text-blue-600 hover:underline">
                {sourceOpp.title}
              </Link>
            </p>
          </div>
        )}

        {/* Household link */}
        {household && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              世帯:{' '}
              <Link to={`/households/${household.id}`} className="text-blue-600 hover:underline">
                {household.name}
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: 基本情報 */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">契約日</p>
              <p className="font-medium text-gray-800">{policy.startDate}</p>
            </div>
            {policy.maturityDate && (
              <div>
                <p className="text-xs text-gray-500">満期日</p>
                <p className="font-medium text-gray-800">{policy.maturityDate}</p>
              </div>
            )}
            {policy.renewalDate && (
              <div>
                <p className="text-xs text-gray-500">次回更新日</p>
                <p className="font-medium text-gray-800">{policy.renewalDate}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">払込方法</p>
              <p className="font-medium text-gray-800">{PAY_MODE_LABELS[policy.payMode] ?? policy.payMode}</p>
            </div>
            {policy.annualPremium && (
              <div>
                <p className="text-xs text-gray-500">年払額</p>
                <p className="font-medium text-gray-800">¥{policy.annualPremium.toLocaleString()}</p>
              </div>
            )}
            {policy.payPeriodYears && (
              <div>
                <p className="text-xs text-gray-500">払込期間</p>
                <p className="font-medium text-gray-800">{policy.payPeriodYears}年</p>
              </div>
            )}
            {policy.premiumPaidUntil && (
              <div>
                <p className="text-xs text-gray-500">払込済期日</p>
                <p className="font-medium text-gray-800">{policy.premiumPaidUntil}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">解約返戻金</p>
              <p className="font-medium text-gray-800">
                {policy.hasCashValue
                  ? policy.cashValue ? `¥${policy.cashValue.toLocaleString()}` : 'あり'
                  : 'なし'
                }
              </p>
            </div>
            {policy.tags.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">タグ</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {policy.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {policy.memo && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">メモ</p>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{policy.memo}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: 保障内容 */}
      {tab === 'coverages' && (
        <div className="space-y-3">
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddCoverage(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                保障を追加
              </button>
            </div>
          )}
          {policy.coverages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">保障内容が登録されていません</p>
            </div>
          ) : (
            policy.coverages.map(cov => {
              const covPerson = persons.find(p => p.id === cov.insuredPersonId);
              return (
                <div key={cov.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                          {COVERAGE_TYPE_LABELS[cov.type] ?? cov.type}
                        </span>
                        {cov.isMain && (
                          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">主契約</span>
                        )}
                        {cov.riderName && (
                          <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">{cov.riderName}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{cov.label}</p>
                      {covPerson && (
                        <p className="text-xs text-gray-500">被保険者: {covPerson.name}</p>
                      )}
                      {cov.faceAmount && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          保険金: ¥{(cov.faceAmount / 10000).toLocaleString()}万
                        </p>
                      )}
                      {cov.unitAmount && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {cov.unit === 'day' ? '日額' : cov.unit === 'time' ? '回額' : '金額'}:
                          ¥{cov.unitAmount.toLocaleString()}
                        </p>
                      )}
                      {cov.memo && <p className="text-xs text-gray-500 mt-1">{cov.memo}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditCoverageId(cov.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('この保障を削除しますか？')) deleteCoverage(cov.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: ステータス履歴 */}
      {tab === 'history' && (
        <div className="space-y-3">
          {historyEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">履歴がありません</div>
          ) : (
            historyEntries.map(h => {
              const changedBy = users.find(u => u.id === h.changedByUserId);
              return (
                <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <PolicyStatusBadge status={h.status} size="sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">
                      {h.changedAt.slice(0, 10)} {h.changedAt.slice(11, 16)}
                      {changedBy && ` · ${changedBy.name}`}
                    </p>
                    {h.note && <p className="text-sm text-gray-700 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: 関連活動 */}
      {tab === 'activities' && (
        <div className="space-y-3">
          {relatedBlocks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">関連する活動記録がありません</div>
          ) : (
            relatedBlocks.slice(0, 20).map(block => (
              <div key={block.id} className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{block.title || '(タイトルなし)'}</p>
                  <span className="text-xs text-gray-500">{block.reportDate}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {block.startTime} — {block.endTime}
                </p>
                {block.memo && <p className="text-xs text-gray-600 mt-1">{block.memo}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Activate Modal */}
      {showActivate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">✅ 契約有効化</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">証券番号 *</label>
                <input
                  value={activatePolicyNumber}
                  onChange={e => setActivatePolicyNumber(e.target.value)}
                  placeholder="例: L-0001234"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">契約日</label>
                <input
                  type="date"
                  value={activateStartDate}
                  onChange={e => setActivateStartDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowActivate(false)}
                className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium"
              >
                有効化する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <PolicyEditModal
          householdId={policy.householdId}
          policy={policy}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Add Coverage Modal */}
      {showAddCoverage && (
        <CoverageEditModal
          policyId={policy.id}
          insuredPersonIds={policy.insuredPersonIds}
          householdId={policy.householdId}
          onClose={() => setShowAddCoverage(false)}
        />
      )}

      {/* Edit Coverage Modal */}
      {editCoverageId && editCoverage && (
        <CoverageEditModal
          policyId={policy.id}
          insuredPersonIds={policy.insuredPersonIds}
          householdId={policy.householdId}
          coverage={editCoverage}
          onClose={() => setEditCoverageId(null)}
        />
      )}
    </div>
  );
}
