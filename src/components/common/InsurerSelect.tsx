// InsurerSelect.tsx — 保険会社（取扱会社マスタ）の共通プルダウン（B3）
// 生保/損保で optgroup 分け。マスタ外の既存自由記述は「(マスタ外) 名称」として選択状態を保つ。
import { useAppStore } from "../../store";
import { INSURER_KIND_LABELS } from "../../utils/insurerMatch";
import type { InsuranceCompany, InsurerKind } from "../../types";

interface Props {
  /** 現在の保険会社名（自由記述 or マスタ名） */
  insurer: string;
  insurerId?: string;
  onChange: (next: { insurer: string; insurerId?: string }) => void;
  className?: string;
  invalid?: boolean;
  id?: string;
  /** E1: 指定すると、その区分（生保/損保）と区分なしの会社だけに絞る（選択済みの会社は残す） */
  kindFilter?: InsurerKind;
  /** D7: 最初のエラー欄へフォーカスするための目印（ProposalProductForm 用） */
  "data-pp-field"?: string;
}

const OUTSIDE = "__outside__";

export function InsurerSelect({ insurer, insurerId, onChange, className, invalid, id, kindFilter, "data-pp-field": ppField }: Props) {
  const companies = useAppStore((s) => s.insuranceCompanies);
  const active = companies
    .filter((c) => c.isActive || c.id === insurerId)
    .filter((c) => !kindFilter || !c.kind || c.kind === kindFilter || c.id === insurerId)
    .sort((a, b) => a.order - b.order);
  const inMaster = !!insurerId && companies.some((c) => c.id === insurerId);
  const outside = !inMaster && insurer.trim() !== "";
  const value = inMaster ? insurerId! : outside ? OUTSIDE : "";

  type Group = { kind: InsurerKind | "unknown"; label: string; items: InsuranceCompany[] };
  const groups: Group[] = ([
    { kind: "life", label: INSURER_KIND_LABELS.life, items: active.filter((c) => c.kind === "life") },
    { kind: "non_life", label: INSURER_KIND_LABELS.non_life, items: active.filter((c) => c.kind === "non_life") },
    { kind: "unknown", label: "区分なし", items: active.filter((c) => !c.kind) },
  ] as Group[]).filter((g) => g.items.length > 0);

  return (
    <select
      id={id}
      data-pp-field={ppField}
      className={
        className ??
        `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${invalid ? "border-red-400" : "border-gray-300"}`
      }
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") return onChange({ insurer: "", insurerId: undefined });
        if (v === OUTSIDE) return; // マスタ外は現状維持
        const c = companies.find((x) => x.id === v);
        if (c) onChange({ insurer: c.name, insurerId: c.id });
      }}
    >
      <option value="">（選択してください）</option>
      {outside && <option value={OUTSIDE}>（マスタ外）{insurer}</option>}
      {groups.map((g) => (
        <optgroup key={g.kind} label={g.label}>
          {g.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isActive ? "" : "（無効）"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
