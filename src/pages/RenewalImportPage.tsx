// =====================================================
// RenewalImportPage — 更新予定インポート（CSV取り込み）
// ルート: /renewals/import
// ファイル選択 → プレビュー表（世帯突合結果つき）→ 取り込み確定
// 依存: 軽量自前 CSV パーサ（xlsx 等の重い依存なし）
// =====================================================
import { useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { useShallow } from "zustand/shallow";
import { useAppStore } from "../store";
import {
  parseRenewalCsv,
  matchRenewalHouseholdBulk,
  type MatchedImportRow,
} from "../utils/matchRenewalHousehold";
import type { RenewalCase } from "../types";
import { RenewalImportPreview } from "./renewalImport/RenewalImportPreview";
import {
  parseProductType,
  parseMethod,
  parsePremium,
  genId,
} from "./renewalImport/parsers";

export function RenewalImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { customers, persons, users, currentUserId, importRenewalCases } =
    useAppStore(
      useShallow((s) => ({
        customers: s.customers,
        persons: s.persons,
        users: s.users,
        currentUserId: s.currentUserId,
        importRenewalCases: s.importRenewalCases,
      })),
    );

  const [preview, setPreview] = useState<MatchedImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ── ファイル読み込み ──────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImported(false);
      setParseError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        try {
          const rows = parseRenewalCsv(text);
          if (rows.length === 0) {
            setParseError(
              "データ行が見つかりませんでした。CSVのフォーマットを確認してください。",
            );
            setPreview(null);
            return;
          }
          const matched = matchRenewalHouseholdBulk(rows, customers, persons);
          setPreview(matched);
        } catch (err) {
          setParseError(`CSVの解析に失敗しました: ${String(err)}`);
          setPreview(null);
        }
      };
      reader.readAsText(file, "UTF-8");
    },
    [customers, persons],
  );

  // ── 取り込み確定 ─────────────────────────────────

  const handleImport = useCallback(() => {
    if (!preview || preview.length === 0) return;

    const now = new Date().toISOString();

    const newCases: RenewalCase[] = preview.map((row) => {
      const id = genId();
      const premium = parsePremium(row.prevYearPremium);

      // 担当者 User をユーザー名で探す（見つからなければ currentUserId）
      const ownerUser = users.find((u) => u.name === row.ownerName);
      const ownerUserId = ownerUser?.id ?? currentUserId;

      return {
        id,
        policyId: `imported_${id}`,
        householdId: row.householdId ?? `unmatched_${id}`,
        contractorPersonId: row.contractorPersonId ?? `unmatched_person_${id}`,
        contractorName: row.contractorName,
        groupName: row.groupName || undefined,
        ownerUserId,
        insurer: row.insurer,
        maturityDate: row.maturityDate,
        productType: parseProductType(row.productType),
        prevYearPremium: premium,
        method: parseMethod(row.method),
        status: "not_started" as const,
        survey: {},
        notes: [],
        activityLog: [
          {
            id: genId(),
            kind: "other" as const,
            body: "CSVインポートで案件を登録しました",
            byUserId: currentUserId,
            at: now,
          },
        ],
        tasks: [],
        createdAt: now,
        updatedAt: now,
      };
    });

    importRenewalCases(newCases);
    setImportedCount(newCases.length);
    setImported(true);
  }, [preview, users, currentUserId, importRenewalCases]);

  // ── 突合統計 ─────────────────────────────────────

  const matchedCount =
    preview?.filter((r) => r.matchStatus === "matched").length ?? 0;
  const unmatchedCount =
    preview?.filter((r) => r.matchStatus === "unmatched").length ?? 0;

  return (
    <div className="w-full px-6 py-5">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/renewals"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          aria-label="更新一覧に戻る"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            更新予定インポート
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            CSVファイルを読み込んで更新予定を一括登録します
          </p>
        </div>
      </div>

      {/* 完了メッセージ */}
      {imported && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">
              {importedCount}件の更新予定を取り込みました
            </p>
            <p className="text-sm text-green-600 mt-1">
              更新一覧に追加されました。localStorage に永続化されています。
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => navigate("/renewals")}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                更新一覧へ
              </button>
              <button
                onClick={() => {
                  setImported(false);
                  setPreview(null);
                  setFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                続けてインポート
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: ファイル選択 */}
      {!imported && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              1
            </span>
            CSVファイルを選択
          </h2>

          {/* ファイル選択エリア */}
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            tabIndex={0}
            role="button"
            aria-label="CSVファイルを選択"
          >
            <FileSpreadsheet className="w-10 h-10 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                クリックしてファイルを選択
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV形式（.csv）</p>
            </div>
            {fileName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <Upload className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 font-medium">
                  {fileName}
                </span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* サンプルCSVダウンロード */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <a
              href="/renewal-import-sample.csv"
              download
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              サンプルCSVをダウンロード
            </a>
            <span>
              （ヘッダ:
              契約者/団体名/担当者/保険会社/満期日/種目/前年保険料/手続き手段）
            </span>
          </div>

          {/* エラーメッセージ */}
          {parseError && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: プレビュー + 突合結果 */}
      {!imported && preview && preview.length > 0 && (
        <RenewalImportPreview
          preview={preview}
          matchedCount={matchedCount}
          unmatchedCount={unmatchedCount}
        />
      )}

      {/* STEP 3: 取り込み確定 */}
      {!imported && preview && preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              3
            </span>
            取り込み確定
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            上記 <strong>{preview.length}件</strong> を更新一覧に追加します。
            取り込んだデータはブラウザの localStorage に永続化されます。
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {preview.length}件を取り込む
            </button>
            <button
              onClick={() => {
                setPreview(null);
                setFileName("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-5 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
