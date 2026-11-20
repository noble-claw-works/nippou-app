// CustomerListPage のタブ定義とタブ解決ロジック（コンポーネント外へ切り出し）
// react-refresh/only-export-components を満たすため、純粋関数・定数はこのファイルに置く。

export type CustomerTab = "karte" | "households" | "members" | "policies";

/**
 * URL の ?tab 値を 4 タブへ解決する。
 * 後方互換: 旧「商品」= products → カルテ(karte)、旧「契約」= policies → 保険商品(policies)。
 */
export function resolveTab(raw: string | null): CustomerTab {
  switch (raw) {
    case "karte":
    case "products": // 後方互換（旧「商品」タブ）
      return "karte";
    case "members":
      return "members";
    case "policies":
      return "policies";
    default:
      return "households";
  }
}

export const CUSTOMER_TABS: { key: CustomerTab; label: string }[] = [
  { key: "karte", label: "カルテ" },
  { key: "households", label: "世帯" },
  { key: "members", label: "構成員" },
  { key: "policies", label: "保険商品" },
];
