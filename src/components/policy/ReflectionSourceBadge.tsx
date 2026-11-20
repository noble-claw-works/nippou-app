// =====================================================
// ReflectionSourceBadge.tsx — Doc4 §T4-07
// 契約行に「商談より追加/変更」バッジ + 元商談リンク + 旧値打消線 を表示。
//  - reflectionSource が無い（手入力）契約にはバッジを出さない（既存動作維持）。
//  - 元商談が削除済み（opportunities に無い）場合は『削除済み』表示。
//  - valueHistory 最新の変更から旧値（打消線）を表示。
// =====================================================
import { Link } from "react-router-dom";
import { useAppStore } from "../../store";
import type { Policy } from "../../types";

interface Props {
  policy: Policy;
}

const FIELD_LABEL: Record<string, string> = {
  monthlyPremium: "月払",
  faceAmount: "保険金額",
  productName: "商品名",
  insurer: "保険会社",
  payMode: "払方",
  status: "状態",
};

function fmt(field: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (field === "monthlyPremium" || field === "faceAmount") {
    return `¥${Number(v).toLocaleString()}`;
  }
  return String(v);
}

export function ReflectionSourceBadge({ policy }: Props) {
  const opportunities = useAppStore((s) => s.opportunities);
  const src = policy.reflectionSource;
  // 手入力契約はバッジなし（既存動作維持）
  if (!src) return null;

  const opp = opportunities.find((o) => o.id === src.opportunityId);
  const isNew = src.mode === "new";
  const label = isNew ? "商談より追加" : "商談より変更";
  const badgeClass = isNew
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-purple-50 text-purple-700 border-purple-200";

  // 旧値打消線（existing_change の最新 valueHistory）
  const lastChange = policy.valueHistory?.[policy.valueHistory.length - 1];

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className={`px-1.5 py-0.5 rounded border ${badgeClass}`}>
          {label}
        </span>
        {opp ? (
          <Link
            to={`/opportunities/${opp.id}`}
            className="text-blue-600 hover:underline"
          >
            元商談: {opp.title} →
          </Link>
        ) : (
          <span className="text-gray-400">元商談: 削除済み</span>
        )}
      </div>
      {!isNew && lastChange && lastChange.fields.length > 0 && (
        <div className="text-[11px] text-gray-500">
          {lastChange.fields.map((f) => (
            <span key={f.field} className="mr-2">
              {FIELD_LABEL[f.field] ?? f.field}:{" "}
              <span className="line-through text-gray-400">
                {fmt(f.field, f.before)}
              </span>{" "}
              → <span className="text-gray-700">{fmt(f.field, f.after)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
