import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAppStore } from '../store';
import { NewOpportunityForm } from './NewOpportunityPage/NewOpportunityForm';

// =====================================================
// NewOpportunityPage — 新規案件(商談)作成の専用フルページ
// ルート:
//   /opportunities/new                       … 世帯未選択で入る導線（ページ内で世帯選択）
//   /households/:customerId/opportunities/new … 世帯確定済みで入る導線
//   ?householdId= でも世帯指定可
// =====================================================

export function NewOpportunityPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { customers } = useAppStore(
    useShallow((s) => ({ customers: s.customers })),
  );

  // 世帯の決定: URLパラメータ > クエリ > ページ内選択
  const initialHouseholdId = customerId ?? searchParams.get('householdId') ?? '';
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(initialHouseholdId);
  const [search, setSearch] = useState('');

  const household = customers.find((c) => c.id === selectedHouseholdId);

  // 世帯未選択: 選択UIを表示
  if (!household) {
    const activeCustomers = customers
      .filter((c) => c.status === 'active')
      .filter((c) => (search.trim() ? c.name.includes(search.trim()) : true));

    return (
      <div className="p-4 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        <h1 className="text-xl font-bold text-gray-900 mb-1">🤝 新規案件を作成</h1>
        <p className="text-sm text-gray-500 mb-4">まず対象の世帯を選択してください</p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="世帯名で検索..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {activeCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">該当する世帯がありません</p>
          ) : (
            activeCustomers.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 text-sm"
                onClick={() => setSelectedHouseholdId(c.id)}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> 戻る
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-4">🤝 新規案件を作成</h1>

      <NewOpportunityForm
        householdId={household.id}
        householdName={household.name}
        onCreated={(id) => navigate(`/opportunities/${id}`)}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
