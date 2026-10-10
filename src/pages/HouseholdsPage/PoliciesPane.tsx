// PoliciesPane.tsx — ③保険商品ペイン（追加フォーム含む・工程D）
// 400行以内・追加のみ実装（編集・削除はMVP対象外）

import { useState, useRef } from 'react';
import { ShieldPlus } from 'lucide-react';
import { useAppStore } from '../../store';
import type { ProductCategory, ProposalProduct } from '../../types';

// 今日の日付を YYYY-MM-DD で返すユーティリティ
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PolicyFormState {
  insuredPersonId: string; // 被保険者（Person.id）
  insurerId: string;       // 保険会社マスタ ID
  productCategoryId: string; // 種目マスタ ID (ProductCategoryMaster.id)
  monthlyPremium: string;  // 月払保険料（入力は文字列）
  firstYearCommission: string; // 初年度手数料（入力は文字列）
  firstConsultDate: string; // 初回相談日 YYYY-MM-DD
}

const EMPTY_FORM = (prevDate: string): PolicyFormState => ({
  insuredPersonId: '',
  insurerId: '',
  productCategoryId: '',
  monthlyPremium: '',
  firstYearCommission: '',
  firstConsultDate: prevDate || todayStr(),
});

interface PoliciesPaneProps {
  householdId: string | null;
  householdName?: string;
}

export function PoliciesPane({ householdId, householdName }: PoliciesPaneProps) {
  const {
    persons,
    opportunities,
    users,
    addOpportunity,
    addToast,
    currentUserId,
    insuranceCompanies,
    productCategories,
  } = useAppStore();

  const currentUser = users.find(u => u.id === currentUserId);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 直前に入力した初回相談日を保持（2件目以降の初期値）
  const lastConsultDateRef = useRef<string>(todayStr());
  const [form, setForm] = useState<PolicyFormState>(() => EMPTY_FORM(todayStr()));

  const hPersons = householdId
    ? persons.filter(p => p.householdId === householdId)
    : [];

  // この世帯のopportunityから proposalProducts を収集して一覧表示
  const hOpportunities = householdId
    ? opportunities.filter(o => o.householdId === householdId)
    : [];
  const allProducts: Array<{ product: ProposalProduct; oppId: string }> =
    hOpportunities.flatMap(o =>
      o.proposalProducts.map(p => ({ product: p, oppId: o.id })),
    );

  // isActive:true のマスタのみ
  const activeInsurers = insuranceCompanies.filter(c => c.isActive);
  const activeCategories = productCategories.filter(c => c.isActive);

  const openForm = () => {
    setForm(EMPTY_FORM(lastConsultDateRef.current));
    setShowForm(true);
  };

  const handleAdd = () => {
    if (!householdId) return;
    if (!form.insuredPersonId) {
      addToast({ type: 'error', message: '被保険者を選択してください' });
      return;
    }
    if (!form.insurerId) {
      addToast({ type: 'error', message: '保険会社を選択してください' });
      return;
    }
    if (!form.productCategoryId) {
      addToast({ type: 'error', message: '種目を選択してください' });
      return;
    }
    const monthly = Number(form.monthlyPremium);
    if (!form.monthlyPremium || isNaN(monthly) || monthly < 0) {
      addToast({ type: 'error', message: '月払保険料を正しく入力してください' });
      return;
    }

    const selectedInsurer = activeInsurers.find(c => c.id === form.insurerId);
    const selectedCategory = activeCategories.find(c => c.id === form.productCategoryId);

    if (!selectedInsurer || !selectedCategory) {
      addToast({ type: 'error', message: 'マスタデータの取得に失敗しました' });
      return;
    }

    setSubmitting(true);
    try {
      const firstYearCommNum = form.firstYearCommission
        ? Number(form.firstYearCommission)
        : undefined;

      const product: Omit<ProposalProduct, 'id'> = {
        productCategory: selectedCategory.categoryKey as ProductCategory,
        productName: selectedCategory.name,
        insurer: selectedInsurer.name,    // 名前文字列維持（後方互換）
        insurerId: selectedInsurer.id,     // ★NEW マスタID追加
        insuredPersonId: form.insuredPersonId,
        monthlyPremium: monthly,
        firstYearCommission:
          firstYearCommNum !== undefined && !isNaN(firstYearCommNum)
            ? firstYearCommNum
            : undefined,
        firstConsultDate: form.firstConsultDate || todayStr(),
        memo: '',
      };

      addOpportunity({
        householdId,
        ownerId: currentUser?.id ?? '',
        title: `${selectedInsurer.name} / ${selectedCategory.name}`,
        targetPersonIds: [form.insuredPersonId],
        stage: 'approach',
        status: 'open',
        productCategories: [product.productCategory],
        proposalProducts: [{ ...product, id: '' }],
        needsAnalysisDone: false,
        illustrationProvided: false,
        tags: [],
        memo: '',
        milestones: {
          firstConsultDate: product.firstConsultDate,
        },
      });

      // 直前の初回相談日を更新
      lastConsultDateRef.current = form.firstConsultDate || todayStr();

      addToast({ type: 'success', message: '保険商品を追加しました' });
      setForm(EMPTY_FORM(lastConsultDateRef.current));
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!householdId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        <p className="text-sm">← 世帯を選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            🛡️ 保険商品
          </h2>
          {householdName && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{householdName}</p>
          )}
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ShieldPlus className="w-3 h-3" />
          追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="px-3 py-3 border-b border-blue-100 bg-blue-50 overflow-y-auto max-h-80">
          <p className="text-xs font-semibold text-blue-700 mb-2">保険商品を追加</p>
          <div className="space-y-2">
            {/* 被保険者 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                被保険者 <span className="text-red-500">*</span>
              </label>
              {hPersons.length === 0 ? (
                <p className="text-xs text-amber-600">先に②ペインで構成員を追加してください</p>
              ) : (
                <select
                  value={form.insuredPersonId}
                  onChange={e => setForm(f => ({ ...f, insuredPersonId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">選択してください</option>
                  {hPersons.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 保険会社 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                保険会社 <span className="text-red-500">*</span>
              </label>
              {activeInsurers.length === 0 ? (
                <p className="text-xs text-amber-600">設定→保険会社マスタで追加してください</p>
              ) : (
                <select
                  value={form.insurerId}
                  onChange={e => setForm(f => ({ ...f, insurerId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">選択してください</option>
                  {activeInsurers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 種目 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                種目 <span className="text-red-500">*</span>
              </label>
              {activeCategories.length === 0 ? (
                <p className="text-xs text-amber-600">設定→種目マスタで追加してください</p>
              ) : (
                <select
                  value={form.productCategoryId}
                  onChange={e => setForm(f => ({ ...f, productCategoryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">選択してください</option>
                  {activeCategories
                    .sort((a, b) => a.order - b.order)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              )}
            </div>

            {/* 月払保険料 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                月払保険料 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form.monthlyPremium}
                  onChange={e => setForm(f => ({ ...f, monthlyPremium: e.target.value }))}
                  placeholder="例: 15000"
                  min={0}
                  className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-500">円/月</span>
              </div>
            </div>

            {/* 初年度手数料 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                初年度手数料（円・手入力）
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={form.firstYearCommission}
                  onChange={e => setForm(f => ({ ...f, firstYearCommission: e.target.value }))}
                  placeholder="例: 50000"
                  min={0}
                  className="w-32 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-500">円</span>
              </div>
            </div>

            {/* 初回相談日 */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">
                初回相談日
                <span className="ml-1 text-gray-400">（2件目以降は直前入力値を初期値）</span>
              </label>
              <input
                type="date"
                value={form.firstConsultDate}
                onChange={e => setForm(f => ({ ...f, firstConsultDate: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* ボタン */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={submitting || hPersons.length === 0}
                className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品リスト */}
      <div className="flex-1 overflow-y-auto">
        {allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-8">
            <p className="text-sm">保険商品が登録されていません</p>
            <button
              onClick={openForm}
              className="text-xs text-blue-600 hover:underline"
            >
              + 保険商品を追加
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {allProducts.map(({ product }) => {
              const insuredPerson = persons.find(p => p.id === product.insuredPersonId);
              return (
                <li key={product.id} className="px-3 py-2.5 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {product.productName || product.insurer}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded whitespace-nowrap">
                      {product.productCategory}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>🏢 {product.insurer}</span>
                    {insuredPerson && <span>👤 {insuredPerson.name}</span>}
                    <span className="text-green-700">
                      💰 {product.monthlyPremium.toLocaleString()}円/月
                    </span>
                    {product.firstYearCommission !== undefined && (
                      <span className="text-indigo-700">
                        手数料: {product.firstYearCommission.toLocaleString()}円
                      </span>
                    )}
                    {product.firstConsultDate && (
                      <span>📅 初回相談: {product.firstConsultDate}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 合計フッタ */}
      {allProducts.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-500">
            {allProducts.length}件
            <span className="ml-2 text-green-700 font-medium">
              合計:{' '}
              {allProducts
                .reduce((sum, { product }) => sum + product.monthlyPremium, 0)
                .toLocaleString()}
              円/月
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
