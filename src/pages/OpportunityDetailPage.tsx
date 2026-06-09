import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Edit2, Trash2, CheckSquare, Square } from 'lucide-react';
import { useAppStore } from '../store';
import type { ProposalProduct } from '../types';
import { StageBadge, STAGE_META } from '../components/opportunity/StageBadge';
import { StageSelector } from '../components/opportunity/StageSelector';
import { ProposalProductEditModal } from '../components/opportunity/ProposalProductEditModal';

// =====================================================
// OpportunityDetailPage — 商談案件詳細
// =====================================================

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

const LOST_REASON_LABELS: Record<string, string> = {
  price: '保険料が高い', competitor: '他社に決まった', family_oppose: '家族の反対',
  health_decline: '健康上の理由で加入不可', no_need: '必要性を感じない',
  timing: 'タイミングが合わない', budget: '予算不足', undecided: '検討を保留',
  lost_contact: '連絡が取れなくなった', other: 'その他',
};

type Tab = 'overview' | 'products' | 'activities' | 'todos';

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    opportunities, customers, users, reports,
    updateOpportunity, deleteOpportunity, getPersonsByHousehold,
  } = useAppStore();

  const opp = opportunities.find(o => o.id === id);
  const [tab, setTab] = useState<Tab>('overview');
  const [editingStage, setEditingStage] = useState(false);
  const [editProduct, setEditProduct] = useState<ProposalProduct | null | undefined>(undefined); // undefined = not open
  const [editingFields, setEditingFields] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});

  if (!opp) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>案件が見つかりません</p>
        <button onClick={() => navigate('/opportunities')} className="mt-2 text-blue-500 hover:underline text-sm">
          一覧に戻る
        </button>
      </div>
    );
  }

  const household = customers.find(c => c.id === opp.householdId);
  const persons = getPersonsByHousehold(opp.householdId);
  const owner = users.find(u => u.id === opp.ownerId);

  // Related TimeBlocks
  const relatedBlocks = reports
    .flatMap(r => r.blocks ?? [])
    .filter(b => b.opportunityId === id)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  // Related Todos
  const relatedTodos = reports
    .flatMap(r => (r.todos ?? []).map(t => ({ ...t, date: r.date })))
    .filter(t => t.opportunityId === id);

  const handleDeleteProduct = (productId: string) => {
    const products = opp.proposalProducts.filter(p => p.id !== productId);
    const total = products.reduce((s, p) => s + p.monthlyPremium, 0);
    updateOpportunity(id!, {
      proposalProducts: products,
      productCategories: [...new Set(products.map(p => p.productCategory))],
      totalMonthlyPremium: total > 0 ? total : undefined,
    });
  };

  const handleSaveProduct = (product: ProposalProduct) => {
    const existing = opp.proposalProducts.find(p => p.id === product.id);
    const products = existing
      ? opp.proposalProducts.map(p => p.id === product.id ? product : p)
      : [...opp.proposalProducts, product];
    const total = products.reduce((s, p) => s + p.monthlyPremium, 0);
    updateOpportunity(id!, {
      proposalProducts: products,
      productCategories: [...new Set(products.map(p => p.productCategory))],
      totalMonthlyPremium: total > 0 ? total : undefined,
    });
    setEditProduct(undefined);
  };

  const handleDelete = () => {
    if (!confirm('この案件を削除しますか？')) return;
    deleteOpportunity(id!);
    navigate('/opportunities');
  };

  const handleSaveFields = () => {
    updateOpportunity(id!, {
      nextAction: fieldDraft.nextAction ?? opp.nextAction,
      nextActionDate: fieldDraft.nextActionDate ?? opp.nextActionDate,
      expectedCloseDate: fieldDraft.expectedCloseDate ?? opp.expectedCloseDate,
      memo: fieldDraft.memo ?? opp.memo,
    });
    setEditingFields(false);
    setFieldDraft({});
  };

  const startEditFields = () => {
    setFieldDraft({
      nextAction: opp.nextAction ?? '',
      nextActionDate: opp.nextActionDate ?? '',
      expectedCloseDate: opp.expectedCloseDate ?? '',
      memo: opp.memo,
    });
    setEditingFields(true);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '📊 概要' },
    { key: 'products', label: `📄 提案商品 (${opp.proposalProducts.length})` },
    { key: 'activities', label: `📅 活動履歴 (${relatedBlocks.length})` },
    { key: 'todos', label: `✅ TODO (${relatedTodos.length})` },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/opportunities')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        商談一覧
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{opp.title}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-gray-500">
              <Link
                to={`/households/${opp.householdId}`}
                className="text-blue-600 hover:underline font-medium"
                onClick={e => e.stopPropagation()}
              >
                {household?.name ?? opp.householdId}
              </Link>
              <span>・</span>
              <span>担当: {owner?.name ?? opp.ownerId}</span>
              {opp.totalMonthlyPremium && (
                <>
                  <span>・</span>
                  <span className="font-medium text-gray-700">¥{opp.totalMonthlyPremium.toLocaleString()}/月</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage row */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <StageBadge stage={opp.stage} size="lg" />
          <button
            onClick={() => setEditingStage(v => !v)}
            className="text-sm text-blue-600 hover:underline"
          >
            {editingStage ? 'キャンセル' : 'ステージを変更'}
          </button>
          {opp.nextAction && (
            <span className="text-sm text-gray-500">
              次: {opp.nextAction}
              {opp.nextActionDate && ` (${opp.nextActionDate})`}
            </span>
          )}
        </div>

        {editingStage && (
          <div className="mt-3">
            <StageSelector
              opportunity={opp}
              onClose={() => setEditingStage(false)}
            />
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

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Info grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">基本情報</h2>
              <button
                onClick={editingFields ? handleSaveFields : startEditFields}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {editingFields ? '保存' : '編集'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Stage history checklist */}
              <div>
                <div className="text-gray-500 mb-1">進捗チェックリスト</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opp.needsAnalysisDone}
                      onChange={e => updateOpportunity(id!, { needsAnalysisDone: e.target.checked })}
                      className="rounded"
                    />
                    <span>ニーズ分析完了</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opp.illustrationProvided}
                      onChange={e => updateOpportunity(id!, { illustrationProvided: e.target.checked })}
                      className="rounded"
                    />
                    <span>設計書提示済み</span>
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500">クローズ予定日: </span>
                  {editingFields ? (
                    <input
                      type="date"
                      className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                      value={fieldDraft.expectedCloseDate}
                      onChange={e => setFieldDraft(d => ({ ...d, expectedCloseDate: e.target.value }))}
                    />
                  ) : (
                    <span>{opp.expectedCloseDate ?? '—'}</span>
                  )}
                </div>
                {opp.actualCloseDate && (
                  <div>
                    <span className="text-gray-500">実際のクローズ日: </span>
                    <span>{opp.actualCloseDate}</span>
                  </div>
                )}
                {opp.lostReason && (
                  <div>
                    <span className="text-gray-500">失注理由: </span>
                    <span>{LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason}</span>
                    {opp.lostReasonDetail && (
                      <span className="text-gray-400 ml-1">({opp.lostReasonDetail})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Next action */}
              <div>
                <div className="text-gray-500 mb-1">次アクション</div>
                {editingFields ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      placeholder="次アクション内容"
                      value={fieldDraft.nextAction}
                      onChange={e => setFieldDraft(d => ({ ...d, nextAction: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      value={fieldDraft.nextActionDate}
                      onChange={e => setFieldDraft(d => ({ ...d, nextActionDate: e.target.value }))}
                    />
                  </div>
                ) : (
                  <span>{opp.nextAction ?? '—'}{opp.nextActionDate ? ` (${opp.nextActionDate})` : ''}</span>
                )}
              </div>

              {/* Memo */}
              <div>
                <div className="text-gray-500 mb-1">メモ</div>
                {editingFields ? (
                  <textarea
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-none"
                    rows={3}
                    value={fieldDraft.memo}
                    onChange={e => setFieldDraft(d => ({ ...d, memo: e.target.value }))}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{opp.memo || '—'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stage history timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">ステージ変更履歴</h2>
            <div className="space-y-2">
              {[...opp.stageHistory].reverse().map((h, i) => {
                const meta = STAGE_META[h.stage];
                const changer = users.find(u => u.id === h.changedByUserId);
                return (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-lg leading-none mt-0.5">{meta.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{meta.label}</span>
                        <span className="text-gray-400">{h.changedAt.slice(0, 10)}</span>
                        {changer && <span className="text-gray-400">{changer.name}</span>}
                      </div>
                      {h.note && <div className="text-gray-500 mt-0.5">{h.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">提案商品一覧</h2>
            <button
              onClick={() => setEditProduct(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>

          {opp.proposalProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">提案商品が登録されていません</p>
          ) : (
            <div className="space-y-3">
              {opp.proposalProducts.map(pp => {
                const person = persons.find(p => p.id === pp.insuredPersonId);
                return (
                  <div key={pp.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {PRODUCT_CATEGORY_LABELS[pp.productCategory] ?? pp.productCategory}
                          </span>
                          <span className="font-medium text-gray-800">{pp.productName}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {pp.insurer}
                          {person && ` / 被保険者: ${person.name}`}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-700">
                          月払: ¥{pp.monthlyPremium.toLocaleString()}
                          {pp.faceAmount && ` / 保険金額: ¥${pp.faceAmount.toLocaleString()}`}
                        </div>
                        {pp.memo && <div className="mt-1 text-xs text-gray-400">{pp.memo}</div>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => setEditProduct(pp)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(pp.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              {opp.totalMonthlyPremium && (
                <div className="border-t pt-3 text-sm font-medium text-gray-700 text-right">
                  合計月払: ¥{opp.totalMonthlyPremium.toLocaleString()} / 月
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'activities' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">活動履歴</h2>
          {relatedBlocks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              この案件に紐付く活動記録がありません
            </p>
          ) : (
            <div className="space-y-2">
              {relatedBlocks.map(block => (
                <div key={block.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{block.startTime}–{block.endTime}</span>
                    <span className="font-medium text-gray-800">{block.title}</span>
                  </div>
                  {block.memo && <div className="mt-1 text-gray-500">{block.memo}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'todos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">TODO</h2>
          {relatedTodos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              この案件に紐付く TODO がありません
            </p>
          ) : (
            <div className="space-y-2">
              {relatedTodos.map(todo => (
                <div key={todo.id} className="flex items-start gap-2 text-sm">
                  {todo.completed
                    ? <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    : <Square className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  }
                  <span className={todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {todo.text}
                  </span>
                  <span className="text-gray-400 ml-auto shrink-0">{todo.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product edit modal */}
      {editProduct !== undefined && (
        <ProposalProductEditModal
          product={editProduct ?? undefined}
          opportunityId={id!}
          householdId={opp.householdId}
          onClose={() => setEditProduct(undefined)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}
