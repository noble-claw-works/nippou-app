// HouseholdsPage.tsx — 世帯一覧（シンプル一覧表示・工程F）
// CustomerListPage の「世帯」タブから描画される。
// 3ペイン化前（711c790以前）の世帯一覧UIに戻す。
// HouseholdListPane をフル幅で表示するだけのシンプルなラッパー。
// 3ペインビュー（構成員・保険商品連動）は ProductsPage へ移設。

import { HouseholdListPane } from './HouseholdsPage/HouseholdListPane';

export function HouseholdsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <HouseholdListPane
        selectedId={null}
        onSelect={() => {
          // 世帯タブでは選択しても詳細ペインを開かない（一覧表示のみ）
          // 詳細は /households/:id へのリンクボタンで遷移
        }}
      />
    </div>
  );
}
