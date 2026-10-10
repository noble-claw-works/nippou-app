// =====================================================
// CustomerListPage — 顧客一覧（世帯／商品／契約 統合タブ）(IA-3, 工程F)
// - 「世帯」(HouseholdsPage)・「商品」(ProductsPage)・「契約」(PoliciesPage) をタブで切替
// - 「更新一覧」は /renewals 独立ページへ移設（DESIGN-RENEWAL T4）
// - /households, /policies, /products への直アクセスは初期タブ選択で吸収
// - URL: /customers?tab=households (default) | ?tab=products | ?tab=policies
// =====================================================
import { useSearchParams } from "react-router-dom";
import { HouseholdsPage } from "./HouseholdsPage";
import { ProductsPage } from "./ProductsPage";
import { PoliciesPage } from "./PoliciesPage";

type CustomerTab = "households" | "products" | "policies";

export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get("tab");
  const tab: CustomerTab =
    raw === "policies" ? "policies" : raw === "products" ? "products" : "households";

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
          <button
            onClick={() => setTab("households")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "households"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            世帯
          </button>
          <button
            onClick={() => setTab("products")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "products"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            商品
          </button>
          <button
            onClick={() => setTab("policies")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "policies"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            契約
          </button>
        </nav>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {tab === "households" ? (
          <HouseholdsPage />
        ) : tab === "products" ? (
          <ProductsPage />
        ) : (
          <PoliciesPage />
        )}
      </div>
    </div>
  );
}
