// =====================================================
// CustomerListPage — 顧客一覧（カルテ／世帯／構成員／保険商品 統合タブ）(IA-3③, 工程F)
// - 「カルテ」(ProductsPage・表示専用3ペイン)・「世帯」(HouseholdsPage)・
//   「構成員」(MembersPage・表示専用横断一覧)・「保険商品」(PoliciesPage・表示専用) をタブ切替
// - 入力は世帯詳細に集約。カルテ／構成員／保険商品タブからは入力の口を持たない
// - URL: /customers?tab=karte | ?tab=households (default) | ?tab=members | ?tab=policies
// - 後方互換: ?tab=products → カルテ / ?tab=policies → 保険商品
// =====================================================
import { useSearchParams } from "react-router-dom";
import { HouseholdsPage } from "./HouseholdsPage";
import { ProductsPage } from "./ProductsPage";
import { PoliciesPage } from "./PoliciesPage";
import { MembersPage } from "./MembersPage";
import { CUSTOMER_TABS, resolveTab, type CustomerTab } from "./customerListTabs";

export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = resolveTab(searchParams.get("tab"));

  const setTab = (t: CustomerTab) =>
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (t === "households") {
          n.delete("tab");
        } else {
          n.set("tab", t);
        }
        return n;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col h-full">
      {/* 上部タブバー */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
        <nav className="flex gap-1">
          {CUSTOMER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {tab === "karte" ? (
          <ProductsPage readOnly />
        ) : tab === "households" ? (
          <HouseholdsPage />
        ) : tab === "members" ? (
          <MembersPage />
        ) : (
          <PoliciesPage />
        )}
      </div>
    </div>
  );
}
