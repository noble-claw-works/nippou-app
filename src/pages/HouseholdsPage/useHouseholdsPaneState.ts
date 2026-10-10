// useHouseholdsPaneState.ts — 3ペインの選択/タブ状態管理
import { useState } from 'react';

export type PaneTab = 0 | 1 | 2; // 0=世帯リスト, 1=構成員, 2=保険商品

export function useHouseholdsPaneState() {
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaneTab>(0);

  const selectHousehold = (id: string) => {
    setSelectedHouseholdId(id);
    // スマホではリスト選択後に構成員ペインへ自動遷移
    setActiveTab(1);
  };

  const clearSelection = () => {
    setSelectedHouseholdId(null);
    setActiveTab(0);
  };

  return {
    selectedHouseholdId,
    activeTab,
    setActiveTab,
    selectHousehold,
    clearSelection,
  };
}
