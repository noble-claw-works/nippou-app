// =====================================================
// ReflectionControl.tsx — Doc4 §T4-05 / §T4-08
// 商談明細(ProposalProduct)ごとの「反映方法」3択UI。
//  - new: 新規契約として追加 / existing_change: 既存契約の変更 / none: 反映しない
//  - existing_change は同一世帯(householdId一致)の既存契約のみ候補。候補0件なら選択不可。
//  - 受注後(opp.stage==="issued" もしくは resultPolicyId 確定)は読取専用＋反映結果リンク。
//  - 未反映時は「商談中データ」注記を表示（§T4-08）。
// =====================================================
import { Link } from "react-router-dom";
import { useAppStore } from "../../store";
import type {
  Opportunity,
  ProposalProduct,
  ReflectionMode,
} from "../../types";

interface ReflectionControlProps {
  opp: Opportunity;
  pp: ProposalProduct;
}

const MODE_LABEL: Record<string, string> = {
  new: "新規契約として追加",
  existing_change: "既存契約の変更",
  none: "反映しない",
};

export function ReflectionControl({ opp, pp }: ReflectionControlProps) {
  const getPoliciesByHousehold = useAppStore((s) => s.getPoliciesByHousehold);
  const setProposalReflection = useAppStore((s) => s.setProposalReflection);
  const policies = useAppStore((s) => s.policies);

  const reflection = pp.reflection;
  const mode = reflection?.mode ?? "new";
  const resultPolicyId = reflection?.resultPolicyId;
  const reflected = Boolean(
    resultPolicyId && policies.some((p) => p.id === resultPolicyId),
  );
  // 同一世帯の既存契約（有効/申込中）を変更候補とする
  const candidates = getPoliciesByHousehold(opp.householdId, {
    activeOnly: true,
  }).filter((p) => p.id !== resultPolicyId);
  const hasCandidate = candidates.length > 0;
  const issued = opp.stage === "issued";

  // ── 受注後・反映済み: 読取専用＋反映結果リンク（§T4-08）──
  if (reflected || issued) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          反映: {MODE_LABEL[mode] ?? mode}
        </span>
        {resultPolicyId && reflected ? (
          <Link
            to={`/policies/${resultPolicyId}`}
            className="text-blue-600 hover:underline"
          >
            反映結果の契約を開く →
          </Link>
        ) : (
          <span className="text-gray-400">（未反映）</span>
        )}
      </div>
    );
  }

  // ── 受注前: 3択UI（§T4-05）＋「商談中データ」注記（§T4-08）──
  const needsTarget = mode === "existing_change";
  const targetMissing = needsTarget && !reflection?.targetPolicyId;

  return (
    <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
      <div className="flex items-center gap-1 text-[11px] text-amber-600 mb-1">
        <span className="px-1 py-0.5 rounded bg-amber-50 border border-amber-200">
          商談中データ
        </span>
        <span className="text-gray-400">受注時に契約へ反映されます</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500">反映方法:</span>
        <select
          value={mode}
          onChange={(e) => {
            const nextMode = e.target.value as ReflectionMode;
            setProposalReflection(opp.id, pp.id, {
              ...reflection,
              mode: nextMode,
              // mode を none/new に変えたら対象選択はクリア
              targetPolicyId:
                nextMode === "existing_change"
                  ? reflection?.targetPolicyId
                  : undefined,
            });
          }}
          className="border border-gray-300 rounded px-1.5 py-0.5 text-xs"
        >
          <option value="new">新規契約として追加</option>
          <option value="existing_change" disabled={!hasCandidate}>
            既存契約の変更{!hasCandidate ? "（候補なし）" : ""}
          </option>
          <option value="none">反映しない</option>
        </select>

        {needsTarget && (
          <select
            value={reflection?.targetPolicyId ?? ""}
            onChange={(e) =>
              setProposalReflection(opp.id, pp.id, {
                ...reflection,
                mode: "existing_change",
                targetPolicyId: e.target.value || undefined,
              })
            }
            className={`border rounded px-1.5 py-0.5 text-xs ${
              targetMissing ? "border-red-400" : "border-gray-300"
            }`}
          >
            <option value="">変更対象の契約を選択…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.insurer} / {p.productName}（¥
                {p.monthlyPremium.toLocaleString()}/月）
              </option>
            ))}
          </select>
        )}
        {targetMissing && (
          <span className="text-red-500">変更対象を選択してください</span>
        )}
      </div>
    </div>
  );
}
