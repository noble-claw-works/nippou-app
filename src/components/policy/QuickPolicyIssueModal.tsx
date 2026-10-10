import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Opportunity } from '../../types';

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  life: '生命保険', medical: '医療保険', cancer: 'がん保険',
  income: '就業不能保険', nursing: '介護保険', savings: '学資・貯蓄',
  auto: '自動車保険', fire: '火災保険', liability: '賠償責任保険', other: 'その他',
};

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onIssued?: (policyIds: string[]) => void;
}

type Step = 'confirm' | 'done';

export function QuickPolicyIssueModal({ opportunity, onClose, onIssued }: Props) {
  const { issuePoliciesFromOpportunity, currentUserId, getPersonsByHousehold, addToast } = useAppStore();
  const persons = getPersonsByHousehold(opportunity.householdId);
  const [step, setStep] = useState<Step>('confirm');
  const [issuedPolicyIds, setIssuedPolicyIds] = useState<string[]>([]);

  const handleIssue = () => {
    if (opportunity.proposalProducts.length === 0) {
      addToast({ type: 'error', message: '提案商品がありません。先に商品を追加してください' });
      return;
    }
    const issued = issuePoliciesFromOpportunity(opportunity.id, currentUserId);
    setIssuedPolicyIds(issued.map(p => p.id));
    onIssued?.(issued.map(p => p.id));
    addToast({ type: 'success', message: `${issued.length}件の契約を発行しました (ステータス: 申込中)` });
    setStep('done');
  };

  const getPersonName = (personId: string) => {
    return persons.find(p => p.id === personId)?.name ?? personId;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            🎉 契約発行（受注）
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'confirm' ? (
          <>
            {/* Body */}
            <div className="px-5 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <p className="text-sm font-medium text-blue-800">案件: {opportunity.title}</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  以下の提案商品から契約 (申込中) を自動発行します
                </p>
              </div>

              {opportunity.proposalProducts.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  提案商品がありません
                </div>
              ) : (
                <div className="space-y-2">
                  {opportunity.proposalProducts.map((pp, i) => (
                    <div key={pp.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {i + 1}. {pp.productName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {pp.insurer} / {PRODUCT_CATEGORY_LABELS[pp.productCategory] ?? pp.productCategory}
                          </p>
                          {pp.insuredPersonId && (
                            <p className="text-xs text-gray-500">
                              被保険者: {getPersonName(pp.insuredPersonId)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ¥{pp.monthlyPremium.toLocaleString()}/月
                          </p>
                          {pp.faceAmount && (
                            <p className="text-xs text-gray-500">
                              保険金: ¥{(pp.faceAmount / 10000).toLocaleString()}万
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-xs text-yellow-800">
                  ⚠️ 発行後のステータスは <strong>申込中</strong> です。
                  証券番号取得後に「有効化」してください。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleIssue}
                disabled={opportunity.proposalProducts.length === 0}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium disabled:opacity-50"
              >
                🎉 契約発行 ({opportunity.proposalProducts.length}件)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Done */}
            <div className="px-5 py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-900 mb-1">
                契約発行完了 🎉
              </p>
              <p className="text-sm text-gray-600 mb-4">
                {issuedPolicyIds.length}件の契約を「申込中」で発行しました
              </p>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                証券番号が届いたら「📜 契約」タブから各契約を開き、
                証券番号を入力して「有効化」してください
              </p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={onClose}
                className="w-full py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
