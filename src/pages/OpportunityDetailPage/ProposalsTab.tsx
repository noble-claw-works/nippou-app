import { useState } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import type { Opportunity, ProposalRound } from "../../types";

interface ProposalsTabProps {
  opp: Opportunity;
  onAdd: (data: Omit<ProposalRound, "id" | "roundNo" | "createdAt">) => void;
  onUpdate: (
    roundId: string,
    data: Partial<Omit<ProposalRound, "id" | "roundNo" | "createdAt">>,
  ) => void;
  onDelete: (roundId: string) => void;
}

type RoundDraft = {
  proposalDate: string;
  revisedDate: string;
  memo: string;
  productIds: string[];
};

const EMPTY_DRAFT: RoundDraft = {
  proposalDate: "",
  revisedDate: "",
  memo: "",
  productIds: [],
};

export function ProposalsTab({
  opp,
  onAdd,
  onUpdate,
  onDelete,
}: ProposalsTabProps) {
  const [editingRound, setEditingRound] = useState<
    ProposalRound | null | undefined
  >(undefined);
  const [roundDraft, setRoundDraft] = useState<RoundDraft>(EMPTY_DRAFT);
  const proposals = opp.proposals ?? [];

  const openNewRound = () => {
    setRoundDraft(EMPTY_DRAFT);
    setEditingRound(null);
  };

  const openEditRound = (round: ProposalRound) => {
    setRoundDraft({
      proposalDate: round.proposalDate,
      revisedDate: round.revisedDate ?? "",
      memo: round.memo ?? "",
      productIds: round.productIds,
    });
    setEditingRound(round);
  };

  const handleSave = () => {
    if (!roundDraft.proposalDate) return;
    const payload = {
      proposalDate: roundDraft.proposalDate,
      revisedDate: roundDraft.revisedDate || undefined,
      memo: roundDraft.memo || undefined,
      productIds: roundDraft.productIds,
    };
    if (editingRound === null) onAdd(payload);
    else if (editingRound) onUpdate(editingRound.id, payload);
    setEditingRound(undefined);
  };

  const handleDelete = (roundId: string) => {
    if (!confirm("この提案ラウンドを削除しますか？")) return;
    onDelete(roundId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">提案履歴</h2>
        <button
          onClick={openNewRound}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" /> ラウンド追加
        </button>
      </div>

      {editingRound !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-gray-800 mb-3">
            {editingRound === null
              ? `第${proposals.length + 1}回 提案ラウンドを追加`
              : `第${editingRound.roundNo}回 提案を編集`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                提案日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                value={roundDraft.proposalDate}
                onChange={(e) =>
                  setRoundDraft((d) => ({ ...d, proposalDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                修正日（ステージ不変）
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                value={roundDraft.revisedDate}
                onChange={(e) =>
                  setRoundDraft((d) => ({ ...d, revisedDate: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-600 mb-1">メモ</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              placeholder="提案内容のメモ"
              value={roundDraft.memo}
              onChange={(e) =>
                setRoundDraft((d) => ({ ...d, memo: e.target.value }))
              }
            />
          </div>
          {opp.proposalProducts.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs text-gray-600 mb-1">
                提案商品セット
              </label>
              <div className="space-y-1">
                {opp.proposalProducts.map((pp) => (
                  <label
                    key={pp.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-blue-500"
                      checked={roundDraft.productIds.includes(pp.id)}
                      onChange={(e) =>
                        setRoundDraft((d) => ({
                          ...d,
                          productIds: e.target.checked
                            ? [...d.productIds, pp.id]
                            : d.productIds.filter((pid) => pid !== pp.id),
                        }))
                      }
                    />
                    <span className="text-gray-700">{pp.productName}</span>
                    <span className="text-xs text-gray-400">{pp.insurer}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditingRound(undefined)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!roundDraft.proposalDate}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> 保存
            </button>
          </div>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">提案ラウンドが登録されていません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...proposals]
            .sort((a, b) => b.proposalDate.localeCompare(a.proposalDate))
            .map((round) => {
              const roundProducts = opp.proposalProducts.filter((pp) =>
                round.productIds.includes(pp.id),
              );
              return (
                <div
                  key={round.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          第{round.roundNo}回
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          提案日: {round.proposalDate}
                        </span>
                        {round.revisedDate && (
                          <span className="text-xs text-gray-500">
                            修正日: {round.revisedDate}
                          </span>
                        )}
                      </div>
                      {round.memo && (
                        <p className="mt-1 text-sm text-gray-600">
                          {round.memo}
                        </p>
                      )}
                      {roundProducts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {roundProducts.map((pp) => (
                            <span
                              key={pp.id}
                              className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {pp.productName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditRound(round)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(round.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
