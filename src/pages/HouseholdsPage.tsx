// HouseholdsPage.tsx — 世帯一覧 3ペイン統合（工程D）
// PC(lg:以上)=横3カラム ①世帯リスト ②構成員 ③保険商品+初回相談日
// スマホ=上部タブで①②③切替


import { useHouseholdsPaneState, type PaneTab } from './HouseholdsPage/useHouseholdsPaneState';
import { HouseholdListPane } from './HouseholdsPage/HouseholdListPane';
import { PersonsPane } from './HouseholdsPage/PersonsPane';
import { PoliciesPane } from './HouseholdsPage/PoliciesPane';
import { useAppStore } from '../store';

const TAB_LABELS: Record<PaneTab, string> = {
  0: '👥 世帯',
  1: '👪 構成員',
  2: '🛡️ 保険商品',
};

export function HouseholdsPage() {
  const { selectedHouseholdId, activeTab, setActiveTab, selectHousehold } =
    useHouseholdsPaneState();
  const { customers } = useAppStore();

  const selectedHousehold = selectedHouseholdId
    ? customers.find(c => c.id === selectedHouseholdId)
    : undefined;

  const handleSelectHousehold = (id: string) => {
    selectHousehold(id);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* スマホ: タブバー（lg以上は非表示） */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white">
        {([0, 1, 2] as PaneTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
            {tab !== 0 && !selectedHouseholdId && (
              <span className="ml-1 text-[9px] text-gray-400">（世帯選択後）</span>
            )}
          </button>
        ))}
      </div>

      {/* PC: 横3カラム（lg:以上） / スマホ: アクティブタブのみ表示 */}
      <div className="flex-1 overflow-hidden flex">

        {/* ① 世帯リストペイン */}
        <div
          className={`
            ${activeTab === 0 ? 'flex' : 'hidden'} lg:flex
            lg:w-80 lg:border-r lg:border-gray-200
            flex-col w-full overflow-hidden
          `}
        >
          <HouseholdListPane
            selectedId={selectedHouseholdId}
            onSelect={handleSelectHousehold}
          />
        </div>

        {/* ② 構成員ペイン */}
        <div
          className={`
            ${activeTab === 1 ? 'flex' : 'hidden'} lg:flex
            lg:w-72 lg:border-r lg:border-gray-200
            flex-col w-full overflow-hidden
          `}
        >
          <PersonsPane
            householdId={selectedHouseholdId}
            householdName={selectedHousehold?.name}
          />
        </div>

        {/* ③ 保険商品ペイン */}
        <div
          className={`
            ${activeTab === 2 ? 'flex' : 'hidden'} lg:flex
            flex-1 flex-col overflow-hidden
          `}
        >
          <PoliciesPane
            householdId={selectedHouseholdId}
            householdName={selectedHousehold?.name}
          />
        </div>
      </div>

      {/* スマホ: 世帯選択後の戻るボタン（タブ①以外で表示） */}
      {activeTab !== 0 && selectedHousehold && (
        <div className="lg:hidden fixed bottom-4 right-4">
          <button
            onClick={() => setActiveTab(0)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white border border-gray-300 rounded-full shadow-md hover:bg-gray-50"
          >
            ← 世帯一覧に戻る
          </button>
        </div>
      )}
    </div>
  );
}
