// PoliciesPane.tsx — ③保険商品ペイン（追加・編集フォーム）400行以内
import { useState, useRef } from 'react';
import { ShieldPlus, Pencil } from 'lucide-react';
import { useAppStore } from '../../store';
import type { ProductCategory, ProposalProduct } from '../../types';
import { ProductFormFields, type PolicyFormState } from './ProductFormFields';
import { PolicyCardInlineEdit } from './PolicyCardInlineEdit';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  selectedPersonId?: string;
}

export function PoliciesPane({ householdId, householdName, selectedPersonId = 'all' }: PoliciesPaneProps) {
  const {
    persons, opportunities, users, addOpportunity, updateOpportunity,
    addToast, currentUserId, insuranceCompanies, productCategories,
  } = useAppStore();

  const currentUser = users.find(u => u.id === currentUserId);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastConsultDateRef = useRef<string>(todayStr());
  const [form, setForm] = useState<PolicyFormState>(() => EMPTY_FORM(todayStr()));
  const [editingKey, setEditingKey] = useState<{ oppId: string; productId: string } | null>(null);
  const [editForm, setEditForm] = useState<PolicyFormState>(EMPTY_FORM(todayStr()));
  const [editSubmitting, setEditSubmitting] = useState(false);

  const hPersons = householdId ? persons.filter(p => p.householdId === householdId) : [];
  const hOpportunities = householdId ? opportunities.filter(o => o.householdId === householdId) : [];
  const oppMap = new Map(hOpportunities.map(o => [o.id, o]));

  const allProducts: Array<{ product: ProposalProduct; oppId: string }> =
    hOpportunities.flatMap(o => o.proposalProducts.map(p => ({ product: p, oppId: o.id })));

  const displayProducts = selectedPersonId === 'all'
    ? allProducts
    : allProducts.filter(({ product, oppId }) => {
        if (product.insuredPersonId === selectedPersonId) return true;
        return oppMap.get(oppId)?.contractorPersonId === selectedPersonId;
      });

  const activeInsurers = insuranceCompanies.filter(c => c.isActive);
  const activeCategories = productCategories.filter(c => c.isActive);

  const openForm = () => {
    setEditingKey(null);
    setForm(EMPTY_FORM(lastConsultDateRef.current));
    setShowForm(true);
  };

  const openEditForm = (product: ProposalProduct, oppId: string) => {
    setShowForm(false);
    // insurerId 逆引き: product.insurerId → なければ insurer名で名前一致
    let resolvedInsurerId = product.insurerId ?? '';
    if (!resolvedInsurerId && product.insurer) {
      resolvedInsurerId = activeInsurers.find(c => c.name === product.insurer)?.id ?? '';
    }
    // categoryKey 逆引き: productCategory → productCategories.categoryKey 一致
    const resolvedCategoryId =
      activeCategories.find(c => c.categoryKey === product.productCategory)?.id ?? '';

    setEditForm({
      insuredPersonId: product.insuredPersonId ?? '',
      insurerId: resolvedInsurerId,
      productCategoryId: resolvedCategoryId,
      monthlyPremium: String(product.monthlyPremium ?? ''),
      firstYearCommission: product.firstYearCommission !== undefined ? String(product.firstYearCommission) : '',
      firstConsultDate: product.firstConsultDate ?? todayStr(),
    });
    setEditingKey({ oppId, productId: product.id });
  };

  function validateForm(f: PolicyFormState): string | null {
    if (!f.insuredPersonId) return '被保険者を選択してください';
    if (!f.insurerId) return '保険会社を選択してください';
    if (!f.productCategoryId) return '種目を選択してください';
    const monthly = Number(f.monthlyPremium);
    if (!f.monthlyPremium || isNaN(monthly) || monthly < 0) return '月払保険料を正しく入力してください';
    return null;
  }

  const handleAdd = () => {
    if (!householdId) return;
    const err = validateForm(form);
    if (err) { addToast({ type: 'error', message: err }); return; }

    const selectedInsurer = activeInsurers.find(c => c.id === form.insurerId);
    const selectedCategory = activeCategories.find(c => c.id === form.productCategoryId);
    if (!selectedInsurer || !selectedCategory) {
      addToast({ type: 'error', message: 'マスタデータの取得に失敗しました' });
      return;
    }

    setSubmitting(true);
    try {
      const firstYearCommNum = form.firstYearCommission ? Number(form.firstYearCommission) : undefined;
      const product: Omit<ProposalProduct, 'id'> = {
        productCategory: selectedCategory.categoryKey as ProductCategory,
        productName: selectedCategory.name,
        insurer: selectedInsurer.name,
        insurerId: selectedInsurer.id,
        insuredPersonId: form.insuredPersonId,
        monthlyPremium: Number(form.monthlyPremium),
        firstYearCommission: firstYearCommNum !== undefined && !isNaN(firstYearCommNum) ? firstYearCommNum : undefined,
        firstConsultDate: form.firstConsultDate || todayStr(),
        memo: '',
      };
      addOpportunity({
        householdId, ownerId: currentUser?.id ?? '',
        title: `${selectedInsurer.name} / ${selectedCategory.name}`,
        targetPersonIds: [form.insuredPersonId],
        stage: 'approach', status: 'open',
        productCategories: [product.productCategory],
        proposalProducts: [{ ...product, id: '' }],
        needsAnalysisDone: false, illustrationProvided: false,
        tags: [], memo: '',
        milestones: { firstConsultDate: product.firstConsultDate },
      });
      lastConsultDateRef.current = form.firstConsultDate || todayStr();
      addToast({ type: 'success', message: '保険商品を追加しました' });
      setForm(EMPTY_FORM(lastConsultDateRef.current));
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = () => {
    if (!editingKey) return;
    const err = validateForm(editForm);
    if (err) { addToast({ type: 'error', message: err }); return; }

    const selectedInsurer = activeInsurers.find(c => c.id === editForm.insurerId);
    const selectedCategory = activeCategories.find(c => c.id === editForm.productCategoryId);
    if (!selectedInsurer || !selectedCategory) {
      addToast({ type: 'error', message: 'マスタデータの取得に失敗しました' });
      return;
    }
    const opp = oppMap.get(editingKey.oppId);
    if (!opp) return;
    const existingProduct = opp.proposalProducts.find(p => p.id === editingKey.productId);
    if (!existingProduct) return;

    setEditSubmitting(true);
    try {
      const firstYearCommNum = editForm.firstYearCommission ? Number(editForm.firstYearCommission) : undefined;
      const updatedProduct: ProposalProduct = {
        ...existingProduct,
        productCategory: selectedCategory.categoryKey as ProductCategory,
        productName: selectedCategory.name,
        insurer: selectedInsurer.name,
        insurerId: selectedInsurer.id,
        insuredPersonId: editForm.insuredPersonId,
        monthlyPremium: Number(editForm.monthlyPremium),
        firstYearCommission: firstYearCommNum !== undefined && !isNaN(firstYearCommNum) ? firstYearCommNum : undefined,
        firstConsultDate: editForm.firstConsultDate || todayStr(),
      };
      updateOpportunity(editingKey.oppId, {
        title: `${selectedInsurer.name} / ${selectedCategory.name}`,
        proposalProducts: opp.proposalProducts.map(p => p.id === editingKey.productId ? updatedProduct : p),
        productCategories: [updatedProduct.productCategory],
        milestones: { ...(opp.milestones ?? {}), firstConsultDate: updatedProduct.firstConsultDate },
        targetPersonIds: [editForm.insuredPersonId],
      });
      addToast({ type: 'success', message: '保険商品を更新しました' });
      setEditingKey(null);
    } finally {
      setEditSubmitting(false);
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
          <h2 className="text-sm font-semibold text-gray-700">🛡️ 保険商品</h2>
          {householdName && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{householdName}</p>
          )}
        </div>
        <button onClick={openForm} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <ShieldPlus className="w-3 h-3" />追加
        </button>
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="px-3 py-3 border-b border-blue-100 bg-blue-50 overflow-y-auto max-h-80">
          <p className="text-xs font-semibold text-blue-700 mb-2">保険商品を追加</p>
          <ProductFormFields
            form={form} onChange={patch => setForm(f => ({ ...f, ...patch }))}
            hPersons={hPersons} activeInsurers={activeInsurers} activeCategories={activeCategories}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
              キャンセル
            </button>
            <button type="button" onClick={handleAdd} disabled={submitting || hPersons.length === 0}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
              追加する
            </button>
          </div>
        </div>
      )}

      {/* 商品リスト */}
      <div className="flex-1 overflow-y-auto">
        {allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-8">
            <p className="text-sm">保険商品が登録されていません</p>
            <button onClick={openForm} className="text-xs text-blue-600 hover:underline">+ 保険商品を追加</button>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-8">
            <p className="text-sm">該当する保険商品がありません</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {displayProducts.map(({ product, oppId }) => {
              const isEditing = editingKey?.oppId === oppId && editingKey?.productId === product.id;
              const insuredPerson = persons.find(p => p.id === product.insuredPersonId);
              const opp = oppMap.get(oppId);
              const contractorPerson = opp?.contractorPersonId
                ? persons.find(p => p.id === opp.contractorPersonId) : undefined;
              const contractorName = contractorPerson?.name
                ?? (opp?.contractorPersonId ? '未設定' : hPersons.find(p => p.relation === 'head')?.name ?? '未設定');
              return (
                <li key={product.id} className="px-3 py-2.5 hover:bg-gray-50">
                  {isEditing ? (
                    <PolicyCardInlineEdit
                      editForm={editForm}
                      onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
                      hPersons={hPersons} activeInsurers={activeInsurers} activeCategories={activeCategories}
                      submitting={editSubmitting}
                      onSave={handleEditSave}
                      onCancel={() => setEditingKey(null)}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-medium text-gray-900 text-sm truncate">
                          {product.productName || product.insurer}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded whitespace-nowrap">
                            {product.productCategory}
                          </span>
                          <button type="button" onClick={() => openEditForm(product, oppId)}
                            className="p-1 text-gray-400 hover:text-amber-600 rounded" aria-label="編集" title="編集">
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>🏢 {product.insurer}</span>
                        <span>📝 契約者: {contractorName}</span>
                        {insuredPerson && <span>👤 被保険者: {insuredPerson.name}</span>}
                        <span className="text-green-700">💰 {product.monthlyPremium.toLocaleString()}円/月</span>
                        {product.firstYearCommission !== undefined && (
                          <span className="text-indigo-700">手数料: {product.firstYearCommission.toLocaleString()}円</span>
                        )}
                        {product.firstConsultDate && <span>📅 初回相談: {product.firstConsultDate}</span>}
                      </div>
                    </>
                  )}
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
            {displayProducts.length}件
            {selectedPersonId !== 'all' && <span className="text-gray-400">（全{allProducts.length}件中）</span>}
            <span className="ml-2 text-green-700 font-medium">
              合計: {displayProducts.reduce((sum, { product }) => sum + product.monthlyPremium, 0).toLocaleString()}円/月
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
