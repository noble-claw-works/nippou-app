import { useNavigate } from "react-router-dom";
import { BLOCK_EMOJIS } from "../../../utils";
import type { SidePanelCardsProps } from "../SidePanelCards";

type CustomerSummaryCardProps = Pick<
  SidePanelCardsProps,
  "report" | "customers" | "canEditActual"
>;

export function CustomerSummaryCard({
  report,
  customers,
  canEditActual,
}: CustomerSummaryCardProps) {
  const navigate = useNavigate();
  const visitBlocks = report.blocks.filter(
    (b) => b.type === "visit" && b.customerId,
  );
  const isInProgress = canEditActual === true;

  const handleBatchEntry = (cId: string) => {
    navigate(`/households/${cId}/batch-entry?from=today&date=${report.date}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <span className="text-sm font-semibold text-gray-700 block mb-3">
        👥 顧客対応サマリー
      </span>
      {visitBlocks.length === 0 ? (
        <p className="text-xs text-gray-400">
          訪問ブロックに顧客を設定してください
        </p>
      ) : (
        <div className="space-y-3">
          {visitBlocks.map((block) => {
            const customer = customers.find((c) => c.id === block.customerId);
            return (
              <div
                key={block.id}
                className="border border-gray-100 rounded-lg p-2.5 space-y-1"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <span>{BLOCK_EMOJIS[block.type]}</span>
                  <span className="truncate">{customer?.name ?? "不明"}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                    {block.startTime}–{block.endTime}
                  </span>
                </div>
                {block.customerId && (
                  <div className="pl-5 mt-1">
                    {isInProgress ? (
                      <button
                        type="button"
                        onClick={() => handleBatchEntry(block.customerId!)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[32px] transition-colors"
                      >
                        📋 まとめ入力/更新
                      </button>
                    ) : (
                      <span
                        title="実績入力中のみ利用できます"
                        aria-label="実績入力中のみ利用できます"
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed select-none"
                      >
                        📋 まとめ入力/更新
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {block.collected && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                      ✓ 集金済み
                    </span>
                  )}
                  {block.nextAppointment && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      📅 次回AP: {block.nextAppointment}
                    </span>
                  )}
                  {block.proposal && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full truncate max-w-full">
                      💡 {block.proposal}
                    </span>
                  )}
                  {!block.collected &&
                    !block.nextAppointment &&
                    !block.proposal && (
                      <span className="text-xs text-gray-400">結果未入力</span>
                    )}
                </div>
                {block.result && (
                  <p className="text-xs text-gray-600 pl-5 leading-relaxed">
                    {block.result}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {report.blocks.filter((b) => b.type !== "visit" && b.customerId).length >
        0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <p className="text-xs font-medium text-gray-500">その他の顧客対応</p>
          {report.blocks
            .filter((b) => b.type !== "visit" && b.customerId)
            .map((block) => (
              <div key={block.id} className="flex items-center gap-2 text-sm">
                <span>{BLOCK_EMOJIS[block.type]}</span>
                <span className="text-gray-700 truncate">
                  {customers.find((c) => c.id === block.customerId)?.name ??
                    "不明"}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
