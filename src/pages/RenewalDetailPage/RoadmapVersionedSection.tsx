// =====================================================
// RoadmapVersionedSection — ロードマップ回答（版管理対応）Doc5 T5-07 / §5
// 現行版の有効項目で回答を入力・保存。保存時に当時の版番号で
// スナップショットされ、過去回答は当時の版の項目定義で表示する。
// =====================================================
import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useAppStore } from "../../store";
import type {
  RenewalCase,
  RenewalRoadmapAnswer,
  RenewalRoadmapItemDef,
} from "../../types";
import { activeRoadmapItems } from "../../utils/roadmapTemplate";

interface RoadmapVersionedSectionProps {
  rc: RenewalCase;
}

const GENDER_OPTIONS: { value: "male" | "female" | "other"; label: string }[] =
  [
    { value: "male", label: "男性" },
    { value: "female", label: "女性" },
    { value: "other", label: "その他" },
  ];

const AGE_BAND_OPTIONS = [
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代" },
  { value: "70s_over", label: "70代以上" },
];

export function RoadmapVersionedSection({ rc }: RoadmapVersionedSectionProps) {
  const getCurrentRoadmapTemplate = useAppStore(
    (s) => s.getCurrentRoadmapTemplate,
  );
  const getRoadmapTemplateVersion = useAppStore(
    (s) => s.getRoadmapTemplateVersion,
  );
  const saveRoadmapAnswers = useAppStore((s) => s.saveRoadmapAnswers);
  const currentUserId = useAppStore((s) => s.currentUserId);

  const current = getCurrentRoadmapTemplate();
  const items = useMemo(
    () => (current ? activeRoadmapItems(current.items) : []),
    [current],
  );

  // 最新の回答版（あれば初期値として反映）
  const latestAnswer = useMemo(() => {
    const vs = rc.roadmapVersions ?? [];
    return vs.length > 0 ? vs[vs.length - 1] : undefined;
  }, [rc.roadmapVersions]);

  const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const it of items) {
      const prev = latestAnswer?.answers.find((a) => a.itemDefId === it.id);
      init[it.id] = prev ? Boolean(prev.value) : false;
    }
    return init;
  });
  const [inputDate, setInputDate] = useState(latestAnswer?.inputDate ?? "");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">(
    latestAnswer?.gender ?? "",
  );
  const [ageBand, setAgeBand] = useState(latestAnswer?.ageBand ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const payload: RenewalRoadmapAnswer[] = items.map((it) => ({
      itemDefId: it.id,
      value: Boolean(answers[it.id]),
    }));
    saveRoadmapAnswers(rc.id, payload, {
      inputDate: inputDate || undefined,
      gender: gender || undefined,
      ageBand: ageBand || undefined,
      userId: currentUserId,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!current) {
    return (
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
        ロードマップ項目が未発行です。管理者が「管理 &gt; ロードマップ項目」で発行してください。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">
            ロードマップ回答（現行 v{current.version}）
          </h3>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            回答を保存
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <label className="text-xs text-gray-600">
            入力日
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
            />
          </label>
          <label className="text-xs text-gray-600">
            性別
            <select
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "male" | "female" | "other" | "")
              }
              className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">—</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            年代
            <select
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value)}
              className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">—</option>
              {AGE_BAND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-1.5">
          {items.map((it: RenewalRoadmapItemDef) => (
            <label
              key={it.id}
              className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              <input
                type="checkbox"
                checked={Boolean(answers[it.id])}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [it.id]: e.target.checked,
                  }))
                }
              />
              {it.label}
            </label>
          ))}
        </div>
        {saved && (
          <div className="mt-2 text-xs text-green-700">保存しました</div>
        )}
      </div>

      {/* 過去回答（当時の版の項目定義で表示＝スナップショット） */}
      {(rc.roadmapVersions ?? []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 mb-2">回答履歴</h3>
          <div className="space-y-2">
            {[...(rc.roadmapVersions ?? [])]
              .slice()
              .reverse()
              .map((rv, i) => {
                const tpl = getRoadmapTemplateVersion(rv.templateVersion);
                const defById = new Map<string, RenewalRoadmapItemDef>(
                  (tpl?.items ?? []).map((d) => [d.id, d]),
                );
                return (
                  <div
                    key={`${rv.answeredAt}_${i}`}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>v{rv.templateVersion} の項目で回答</span>
                      <span>{rv.answeredAt.slice(0, 10)}</span>
                    </div>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      {rv.answers.map((a) => {
                        const def = defById.get(a.itemDefId);
                        return (
                          <li key={a.itemDefId}>
                            {def?.label ?? a.itemDefId}:{" "}
                            {typeof a.value === "boolean"
                              ? a.value
                                ? "はい"
                                : "いいえ"
                              : String(a.value)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
