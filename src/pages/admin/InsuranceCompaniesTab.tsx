// InsuranceCompaniesTab.tsx — 管理画面「保険会社」タブ（B3・システム管理者のみ / Q8）
// 取扱会社マスタの追加・名称/別名/区分の編集・有効/無効・並び順。削除は使用中のものは不可（無効化を案内）。
import { useState } from "react";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useAppStore } from "../../store";
import type { InsuranceCompany, InsurerKind } from "../../types";
import { INSURER_KIND_LABELS, parseAliases } from "../../utils/insurerMatch";

export function InsuranceCompaniesTab({ canEdit }: { canEdit: boolean }) {
  const {
    insuranceCompanies,
    opportunities,
    addInsuranceCompany,
    updateInsuranceCompany,
    removeInsuranceCompany,
  } = useAppStore();
  const sorted = [...insuranceCompanies].sort((a, b) => a.order - b.order);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InsurerKind>("life");
  const [aliases, setAliases] = useState("");

  const usage = (id: string) =>
    opportunities.reduce(
      (n, o) => n + (o.proposalProducts ?? []).filter((p) => p.insurerId === id).length,
      0,
    );

  const handleAdd = () => {
    const n = name.trim();
    if (!n) return;
    if (insuranceCompanies.some((c) => c.name === n)) {
      alert("同じ名称の保険会社が既にあります");
      return;
    }
    const maxOrder = insuranceCompanies.reduce((m, c) => Math.max(m, c.order), 0);
    addInsuranceCompany({ name: n, kind, aliases: parseAliases(aliases), isActive: true, order: maxOrder + 1 });
    setName("");
    setAliases("");
  };

  const move = (c: InsuranceCompany, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === c.id);
    const other = sorted[idx + dir];
    if (!other) return;
    updateInsuranceCompany(c.id, { order: other.order });
    updateInsuranceCompany(other.id, { order: c.order });
  };

  const handleRemove = (c: InsuranceCompany) => {
    const n = usage(c.id);
    if (n > 0) {
      alert(`「${c.name}」は ${n} 件の提案商品で使用中のため削除できません。無効にしてください。`);
      return;
    }
    if (!confirm(`「${c.name}」を削除しますか？`)) return;
    removeInsuranceCompany(c.id);
  };

  return (
    <div className="space-y-4" data-testid="insurance-companies-tab">
      <p className="text-xs text-gray-500">
        提案商品の保険会社プルダウンに出る取扱会社です。現在は仮の 12 社です（正式リストは確定後に差し替え）。
      </p>
      {canEdit && (
        <div className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-lg p-3">
          <label className="text-xs text-gray-600">
            会社名
            <input
              aria-label="新規会社名"
              className="block border border-gray-300 rounded px-2 py-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600">
            区分
            <select
              aria-label="新規区分"
              className="block border border-gray-300 rounded px-2 py-1 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as InsurerKind)}
            >
              <option value="life">{INSURER_KIND_LABELS.life}</option>
              <option value="non_life">{INSURER_KIND_LABELS.non_life}</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            別名（カンマ区切り）
            <input
              aria-label="新規別名"
              className="block border border-gray-300 rounded px-2 py-1 text-sm"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>
      )}
      <table className="w-full text-sm bg-white border border-gray-200 rounded-lg">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            <th className="p-2">順</th>
            <th className="p-2">会社名</th>
            <th className="p-2">区分</th>
            <th className="p-2">別名</th>
            <th className="p-2">使用</th>
            <th className="p-2">有効</th>
            {canEdit && <th className="p-2" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="p-2 whitespace-nowrap">
                {canEdit ? (
                  <>
                    <button type="button" aria-label="上へ" disabled={i === 0} onClick={() => move(c, -1)}>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" aria-label="下へ" disabled={i === sorted.length - 1} onClick={() => move(c, 1)}>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  i + 1
                )}
              </td>
              <td className="p-2">
                {canEdit ? (
                  <input
                    aria-label={`${c.name} 会社名`}
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name) updateInsuranceCompany(c.id, { name: v });
                    }}
                  />
                ) : (
                  c.name
                )}
              </td>
              <td className="p-2">
                {canEdit ? (
                  <select
                    aria-label={`${c.name} 区分`}
                    className="border border-gray-300 rounded px-1 py-1"
                    value={c.kind ?? ""}
                    onChange={(e) =>
                      updateInsuranceCompany(c.id, { kind: (e.target.value || undefined) as InsurerKind | undefined })
                    }
                  >
                    <option value="">未設定</option>
                    <option value="life">{INSURER_KIND_LABELS.life}</option>
                    <option value="non_life">{INSURER_KIND_LABELS.non_life}</option>
                  </select>
                ) : c.kind ? (
                  INSURER_KIND_LABELS[c.kind]
                ) : (
                  "—"
                )}
              </td>
              <td className="p-2">
                {canEdit ? (
                  <input
                    aria-label={`${c.name} 別名`}
                    className="border border-gray-300 rounded px-2 py-1 w-full"
                    defaultValue={(c.aliases ?? []).join(", ")}
                    onBlur={(e) => updateInsuranceCompany(c.id, { aliases: parseAliases(e.target.value) })}
                  />
                ) : (
                  (c.aliases ?? []).join(", ")
                )}
              </td>
              <td className="p-2 text-gray-500">{usage(c.id)}件</td>
              <td className="p-2">
                <input
                  type="checkbox"
                  aria-label={`${c.name} 有効`}
                  checked={c.isActive}
                  disabled={!canEdit}
                  onChange={(e) => updateInsuranceCompany(c.id, { isActive: e.target.checked })}
                />
              </td>
              {canEdit && (
                <td className="p-2">
                  <button type="button" className="text-xs text-red-600" onClick={() => handleRemove(c)}>
                    削除
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
