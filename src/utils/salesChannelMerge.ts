// =====================================================
// salesChannelMerge.ts — チャネルマスタの読み込み時移行（冪等）
// 保存済みマスタに、初期データにあって保存側に無いチャネルを追加する。
// - id 一致 or（同じ親の下で）同名 が在れば追加しない（手で追加済みの重複防止）
// - 親が保存側に無い子は追加しない（親も初期データから追加される想定）
// 編集済みの既存レコードは上書きしない。
// =====================================================
import type { SalesChannel } from "../types";

export function mergeSalesChannels(
  stored: SalesChannel[],
  initial: SalesChannel[],
): SalesChannel[] {
  const out = [...stored];
  const have = new Set(stored.map((c) => c.id));
  // 親 → 子の順で処理（親の id 解決のため、親を先に）
  const ordered = [
    ...initial.filter((c) => c.parentId === null),
    ...initial.filter((c) => c.parentId !== null),
  ];
  for (const c of ordered) {
    if (have.has(c.id)) continue;
    const sameName = out.find(
      (x) => x.parentId === c.parentId && x.name.trim() === c.name.trim(),
    );
    if (sameName) {
      // 同名が既にある場合、その id を以後の子の親参照に使う必要は無い（初期データの子 id は ch_ 固定）
      continue;
    }
    out.push(c);
    have.add(c.id);
  }
  return out.length === stored.length ? stored : out;
}
