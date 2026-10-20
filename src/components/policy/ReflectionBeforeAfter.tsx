// =====================================================
// ReflectionBeforeAfter.tsx — Doc4 §T4-06
// 受注反映の Before/After を二本立てで表示:
//  - 確定集計（sumMonthlyPremium confirmed）: 申込中(pending)は非算入（§0-②）
//  - 見込（projected: 申込中を含む）: 反映後の見込値
// =====================================================
import { sumMonthlyPremium, toAnnual } from "../../utils/reflectionAggregate";
import type { Policy } from "../../types";

interface Props {
  before: Policy[];
  after: Policy[];
}

function Row({
  label,
  monthly,
  annual,
  muted,
}: {
  label: string;
  monthly: number;
  annual: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between text-xs ${
        muted ? "text-gray-400" : "text-gray-700"
      }`}
    >
      <span>{label}</span>
      <span className="font-medium">
        ¥{monthly.toLocaleString()}/月
        <span className="text-gray-400"> （年 ¥{annual.toLocaleString()}）</span>
      </span>
    </div>
  );
}

export function ReflectionBeforeAfter({ before, after }: Props) {
  const confBefore = sumMonthlyPremium(before, "confirmed");
  const confAfter = sumMonthlyPremium(after, "confirmed");
  const projBefore = sumMonthlyPremium(before, "projected");
  const projAfter = sumMonthlyPremium(after, "projected");

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-600">反映前 → 反映後</p>

      {/* 確定集計（申込中は非算入） */}
      <div className="space-y-1">
        <p className="text-[11px] text-gray-500">
          確定集計（有効契約のみ・申込中は非算入）
        </p>
        <Row label="反映前" monthly={confBefore} annual={toAnnual(confBefore)} />
        <Row
          label="反映後（確定）"
          monthly={confAfter}
          annual={toAnnual(confAfter)}
        />
        {confAfter === confBefore && (
          <p className="text-[11px] text-amber-600">
            ※ 反映分は申込中のため確定集計は変わりません
          </p>
        )}
      </div>

      {/* 見込（申込中含む） */}
      <div className="space-y-1 border-t border-dashed border-gray-200 pt-2">
        <p className="text-[11px] text-gray-500">見込（申込中を含む）</p>
        <Row
          label="反映前（見込）"
          monthly={projBefore}
          annual={toAnnual(projBefore)}
          muted
        />
        <Row
          label="反映後（見込）"
          monthly={projAfter}
          annual={toAnnual(projAfter)}
        />
        {projAfter > projBefore && (
          <p className="text-[11px] text-emerald-600">
            見込 +¥{(projAfter - projBefore).toLocaleString()}/月
          </p>
        )}
      </div>
    </div>
  );
}
