// HouseholdsPage.tsx — 世帯タブ本格一覧（#305 工程F改修）
// HouseholdListFull を描画するだけのラッパー。
// HouseholdListPane は ProductsPage 側でそのまま利用継続。

import { HouseholdListFull } from './HouseholdsPage/HouseholdListFull';

export function HouseholdsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <HouseholdListFull />
    </div>
  );
}
