// useNewOpportunityDraft.ts — 新規案件作成（3ペイン）の入力下書き state
// ② 案件ペインと ③ 提案商品ペインが同じ下書きを読み書きする。11/08 指示書 design.md §5。

import { useCallback, useMemo, useState } from 'react';
import { makeInitialDraft, isDraftDirty, type OpportunityDraft } from './newOpportunityDraft';

export function useNewOpportunityDraft(defaultOwnerId: string) {
  const [draft, setDraft] = useState<OpportunityDraft>(() => makeInitialDraft(defaultOwnerId));
  const [error, setError] = useState('');

  const update = useCallback((patch: Partial<OpportunityDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setError('');
  }, []);

  /** 全項目を初期値（担当者=既定担当）に戻す。提案商品も 0 件になる */
  const reset = useCallback(() => {
    setDraft(makeInitialDraft(defaultOwnerId));
    setError('');
  }, [defaultOwnerId]);

  const isDirty = useMemo(() => isDraftDirty(draft), [draft]);

  return { draft, update, reset, isDirty, error, setError };
}
