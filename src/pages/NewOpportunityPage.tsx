import { useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PaneShell } from './NewOpportunityPage/PaneShell';
import { HouseholdPickPane } from './NewOpportunityPage/HouseholdPickPane';
import { OpportunityDraftPane } from './NewOpportunityPage/OpportunityDraftPane';
import { ProposalProductsPane } from './NewOpportunityPage/ProposalProductsPane';
import { useNewOpportunityDraft } from './NewOpportunityPage/useNewOpportunityDraft';
import { useHouseholdSelection, resolveInitialHouseholdId } from './NewOpportunityPage/useHouseholdSelection';
import { buildOpportunityInput, resolveDefaultOwnerId, validateDraft } from './NewOpportunityPage/newOpportunityDraft';

// =====================================================
// NewOpportunityPage — 新規案件(商談)作成の専用フルページ（3ペイン）
// 11/08 指示書 design.md: ①世帯 → ②案件 → ③提案商品 を 1 画面で横に並べる（スマホは縦）。
// ルート:
//   /opportunities/new                       … 世帯未選択で入る導線（①で世帯選択）
//   /households/:customerId/opportunities/new … 世帯確定済みで入る導線
//   ?householdId= でも世帯指定可。選択を変えても URL は変えない
// =====================================================

const PANE2_HEADING_ID = 'new-opp-pane-2';

export function NewOpportunityPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { customers, users, currentUserId, addOpportunity } = useAppStore();

  const activeIds = customers.filter(c => c.status === 'active').map(c => c.id);
  const initialId = resolveInitialHouseholdId(customerId, searchParams.get('householdId'), activeIds);

  const defaultOwnerId = resolveDefaultOwnerId(currentUserId, users);
  const { draft, update, reset, isDirty, error, setError } = useNewOpportunityDraft(defaultOwnerId);

  // 未入力のまま世帯を替えたら、前の世帯の対象者だけ外す
  const clearTargets = useCallback(() => update({ targetPersonIds: [] }), [update]);
  const selection = useHouseholdSelection({ initialId, isDirty, resetDraft: reset, onSwitched: clearTargets });
  const householdId = selection.householdId;

  // スマホでは世帯を選んだら②の見出しまでスクロール
  const scrollToPane2 = () => {
    if (typeof window === 'undefined' || window.matchMedia?.('(min-width: 1024px)').matches) return;
    window.setTimeout(() => {
      document.getElementById(PANE2_HEADING_ID)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  const handleSelect = (id: string) => {
    if (selection.requestSelect(id).switched) scrollToPane2();
  };
  const handleCreated = (id: string) => {
    selection.selectCreated(id);
  };
  const handleConfirmSwitch = () => {
    if (selection.confirmSwitch().switched) scrollToPane2();
  };

  const canSubmit = !!householdId && draft.title.trim() !== '' && !!draft.ownerId;
  const handleSubmit = () => {
    const err = validateDraft(draft, householdId);
    if (err) {
      setError(err);
      return;
    }
    const opp = addOpportunity(buildOpportunityInput(draft, householdId));
    navigate(`/opportunities/${opp.id}`);
  };

  return (
    <div className="p-4 pb-24 lg:pb-4 max-w-[1440px] mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-3">🤝 新規案件を作成</h1>

      <div className="grid grid-cols-1 gap-4 lg:gap-0 lg:grid-cols-[300px_420px_minmax(0,1fr)] lg:h-[calc(100vh-13rem)] lg:min-h-[480px] lg:bg-white lg:border lg:border-gray-200 lg:rounded-lg lg:overflow-hidden">
        <PaneShell no={1} title="世帯">
          <HouseholdPickPane
            selectedId={householdId}
            onSelect={handleSelect}
            onCreated={handleCreated}
            justCreatedId={selection.justCreatedId}
          />
        </PaneShell>

        <PaneShell
          no={2}
          title="案件"
          headingId={PANE2_HEADING_ID}
          disabled={!householdId}
          disabledHint="← 世帯を選ぶか、新規世帯を登録してください"
        >
          <OpportunityDraftPane householdId={householdId} draft={draft} onChange={update} error={error} />
        </PaneShell>

        <PaneShell
          no={3}
          title="提案商品"
          disabled={!householdId}
          disabledHint="← 案件を入力すると、提案商品を追加できます"
        >
          <ProposalProductsPane
            householdId={householdId}
            products={draft.proposalProducts}
            onChange={products => update({ proposalProducts: products })}
          />
        </PaneShell>
      </div>

      <div className="fixed lg:sticky bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 lg:mt-3 lg:px-0">
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            作成する
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={selection.pendingId !== null}
        title="世帯を切り替えますか？"
        message="入力中の案件と提案商品は消えます"
        confirmLabel="切り替える"
        confirmVariant="danger"
        onConfirm={handleConfirmSwitch}
        onClose={selection.cancelSwitch}
      />
    </div>
  );
}
