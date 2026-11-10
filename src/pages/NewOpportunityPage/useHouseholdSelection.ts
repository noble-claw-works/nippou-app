// useHouseholdSelection.ts — 新規案件作成①ペインの世帯選択と切替確認
// 入力ありで別世帯を選んだら保留にし、確認ダイアログの結果で切替/取消する（D2・design.md §2.3）。

import { useCallback, useState } from 'react';

export interface SelectionState {
  householdId: string;
  pendingId: string | null;
}

export type SelectionAction =
  | { type: 'request'; id: string }
  | { type: 'confirm' }
  | { type: 'cancel' };

/** URL の customerId / householdId から初期選択を決める。active 世帯に無ければ未選択 */
export function resolveInitialHouseholdId(
  customerIdParam: string | undefined,
  searchHouseholdId: string | null | undefined,
  activeIds: string[],
): string {
  const id = customerIdParam ?? searchHouseholdId ?? '';
  return id && activeIds.includes(id) ? id : '';
}

/**
 * 選択状態の遷移。dirty=入力ありか。
 * 戻り値 reset=true のときは呼び出し側で下書きを初期化する。
 * 戻り値 switched=true のときは即切替（対象者のクリアは呼び出し側）。
 */
export function nextSelection(
  state: SelectionState,
  action: SelectionAction,
  dirty: boolean,
): { state: SelectionState; reset: boolean; switched: boolean } {
  if (action.type === 'request') {
    if (action.id === state.householdId) return { state, reset: false, switched: false };
    if (!state.householdId || !dirty) {
      return { state: { householdId: action.id, pendingId: null }, reset: false, switched: true };
    }
    return { state: { ...state, pendingId: action.id }, reset: false, switched: false };
  }
  if (action.type === 'confirm') {
    if (state.pendingId === null) return { state, reset: false, switched: false };
    return { state: { householdId: state.pendingId, pendingId: null }, reset: true, switched: true };
  }
  return { state: { ...state, pendingId: null }, reset: false, switched: false };
}

interface Options {
  initialId: string;
  isDirty: boolean;
  /** 確認後の切替で下書きを初期化する */
  resetDraft: () => void;
  /** 未入力で即切替したとき（対象者だけ外す） */
  onSwitched?: () => void;
}

export function useHouseholdSelection({ initialId, isDirty, resetDraft, onSwitched }: Options) {
  const [state, setState] = useState<SelectionState>({ householdId: initialId, pendingId: null });
  /** 直前に新規登録した世帯（世帯員フォームの自動オープン用） */
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  const apply = useCallback(
    (action: SelectionAction) => {
      const r = nextSelection(state, action, isDirty);
      if (r.state !== state) setState(r.state);
      if (r.reset) resetDraft();
      else if (r.switched) onSwitched?.();
      return r;
    },
    [state, isDirty, resetDraft, onSwitched],
  );

  const requestSelect = useCallback((id: string) => apply({ type: 'request', id }), [apply]);
  const confirmSwitch = useCallback(() => apply({ type: 'confirm' }), [apply]);
  // ConfirmDialog は確定時に onConfirm → onClose の順で呼ぶ。cancel は保留を消すだけで選択は戻さない
  const cancelSwitch = useCallback(() => setState(s => ({ ...s, pendingId: null })), []);
  const selectCreated = useCallback(
    (id: string) => {
      setJustCreatedId(id);
      apply({ type: 'request', id });
    },
    [apply],
  );

  return {
    householdId: state.householdId,
    pendingId: state.pendingId,
    justCreatedId,
    requestSelect,
    confirmSwitch,
    cancelSwitch,
    selectCreated,
  };
}
