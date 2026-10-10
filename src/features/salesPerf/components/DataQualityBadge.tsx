// =====================================================
// DataQualityBadge.tsx — 集計n件/要確認m件 常時表示
// T1-1: クリックで要確認一覧(簡易)表示
// =====================================================
import { useState, useMemo } from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useSalesPerfStore } from '../store';
import { useAppStore } from '../../../store/index';
import { dataQuality } from '../lib/salesPerfMetrics';
import { getScopeUserIds } from '../lib/salePerfScope';
import { applyFilter } from '../lib/salesPerfMetrics';

// ----------------------------------------
// DataQualityBadge
// ----------------------------------------
export function DataQualityBadge() {
  const { filter, masters, contracts } = useSalesPerfStore();
  const currentRole = useAppStore(s => s.currentRole) as 'general' | 'manager' | 'admin' | 'executive';
  const currentUserId = useAppStore(s => s.currentUserId);
  const [showDetail, setShowDetail] = useState(false);

  // 品質サマリー
  const quality = useMemo(
    () => dataQuality(contracts, filter, masters, currentRole, currentUserId),
    [contracts, filter, masters, currentRole, currentUserId],
  );

  // 要確認コントラクト一覧 (クリック時に表示)
  const reviewContracts = useMemo(() => {
    if (!showDetail) return [];
    const scopeIds = getScopeUserIds(currentRole, currentUserId, filter, masters);
    const filtered = applyFilter(contracts, filter, scopeIds);
    return filtered.filter(c => c._issues.length > 0).slice(0, 50); // 最大50件
  }, [showDetail, contracts, filter, masters, currentRole, currentUserId]);

  return (
    <>
      {/* バッジ */}
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
          集計 {quality.total.toLocaleString('ja-JP')}件
        </span>
        <button
          onClick={() => setShowDetail(true)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition-colors ${
            quality.needsReview > 0
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700 border border-green-200 cursor-default'
          }`}
          disabled={quality.needsReview === 0}
          title={quality.needsReview > 0 ? '要確認一覧を表示' : 'データ品質: 問題なし'}
        >
          {quality.needsReview > 0 ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <CheckCircle className="w-3 h-3" />
          )}
          要確認 {quality.needsReview}件
        </button>
      </div>

      {/* 要確認一覧モーダル */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          {/* バックドロップ */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDetail(false)}
          />
          {/* モーダル本体 */}
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[70vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <h2 className="text-sm font-semibold text-gray-800">
                  要確認データ一覧
                </h2>
                <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {quality.needsReview}件
                </span>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* テーブル */}
            <div className="overflow-auto flex-1 p-1">
              {reviewContracts.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  要確認データなし
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">ID</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">ライン</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">保険会社</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">種目</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">問題</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewContracts.map(c => (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-yellow-50/50">
                        <td className="px-3 py-1.5 font-mono text-gray-500">{c.id.slice(0, 8)}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            c.line === 'life'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}>
                            {c.line === 'life' ? '生保' : '損保'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">{c.insurer}</td>
                        <td className="px-3 py-1.5 text-gray-600">{c.productType}</td>
                        <td className="px-3 py-1.5">
                          {c._issues.map(issue => (
                            <span
                              key={issue}
                              className="inline-block bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded mr-1 mb-0.5"
                            >
                              {issue}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {quality.needsReview > 50 && (
                <p className="text-center text-xs text-gray-400 py-2">
                  ※ 先頭50件を表示。全{quality.needsReview}件はS7契約明細でご確認ください。
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
