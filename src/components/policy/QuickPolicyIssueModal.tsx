import { useMemo, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store';
import type { Opportunity } from '../../types';
import { uid } from '../../store/_internal/constants';
import { projectReflectedPolicies } from '../../utils/reflectionPolicyFactory';
import { ReflectionBeforeAfter } from './ReflectionBeforeAfter';

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
  const {
    reflectOpportunityToPolicies,
    currentUserId,
    getPersonsByHousehold,
    getPoliciesByHousehold,
    addToast,
  } = useAppStore();
  // policies を購読して Before/After を再計算（store 更新に追随）
  const allPolicies = useAppStore((s) => s.policies);
  const persons = getPersonsByHousehold(opportunity.householdId);
  const [step, setStep] = useState<Step>('confirm');
  const [issuedPolicyIds, setIssuedPolicyIds] = useState<string[]>([]);

  // ── §T4-06 Before/After（確定/見込 二本立て）──
  const beforePolicies = useMemo(
    () => getPoliciesByHousehold(opportunity.householdId),
    // allPolicies 依存で再計算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opportunity.householdId, allPolicies],
  );
  const afterPolicies = useMemo(
    () =>
      projectReflectedPolicies(
        opportunity,
        beforePolicies,
        currentUserId,
        new Date().toISOString(),
        uid,
      ),
    [opportunity, beforePolicies, currentUserId],
  );

  // ── E2: existing_change で変更対象未選択の明細があるか ──
  const targetMissing = opportunity.proposalProducts.some(
    (pp) =>
      (pp.reflection?.mode ?? 'new') === 'existing_change' &&
      !pp.reflection?.targetPolicyId,
  );
  // E1: 明細0件
  const noProducts = opportunity.proposalProducts.length === 0;
  const canIssue = !noProducts && !targetMissing;

  const handleIssue = () => {
    // E1: 明細0件は不可
    if (noProducts) {
      addToast({ type: 'error', message: '提案商品がありません。先に商品を追加してください' });
      return;
    }
    // E2: 既存変更の対象未選択は不可
    if (targetMissing) {
      addToast({
        type: 'error',
        message: '「既存契約の変更」の変更対象が未選択の明細があります',
      });
      return;
    }
    try {
      // §T4-03 反映トランザクション（全or無・冪等・mode別）
      const reflected = reflectOpportunityToPolicies(
        opportunity.id,
        currentUserId,
      );
      setIssuedPolicyIds(reflected.map((p) => p.id));
      onIssued?.(reflected.map((p) => p.id));
      addToast({
        type: 'success',
        message: `${reflected.length}件の契約へ反映しました (ステータス: 申込中)`,
      });
      setStep('done');
    } catch (e) {
      // E3: 競合/検証失敗 → 全ロールバック済み。出し直しを促す。
      const msg =
        e instanceof Error && /CONFLICT|TARGET/.test(e.message)
          ? '反映対象の契約が変更/削除されたため反映できませんでした。内容を確認して再度お試しください。'
          : '反映処理に失敗しました。内容を確認して再度お試しください。';
      addToast({ type: 'error', message: msg });
    }
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

              {/* §T4-06 Before/After（確定=非算入 / 見込=申込中含む） */}
              {!noProducts && (
                <ReflectionBeforeAfter
                  before={beforePolicies}
                  after={afterPolicies}
                />
              )}

              {targetMissing && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700">
                    「既存契約の変更」を選んだ明細の変更対象が未選択です。
                    商品タブで変更対象を選択してください。
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-xs text-yellow-800">
                  ⚠️ 反映後のステータスは <strong>申込中</strong> です。
                  確定集計（総月払/年換算）には算入されません。
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
                disabled={!canIssue}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium disabled:opacity-50"
              >
                🎉 契約へ反映 ({opportunity.proposalProducts.length}件)
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
