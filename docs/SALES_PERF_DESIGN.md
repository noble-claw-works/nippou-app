# 営業実績ダッシュボード v1 — 全体設計 & 実装タスク分解

> 主上「大至急デモ・ノンストップ実装」御下命(2026-07-06)。
> 本書は **実装直行できる粒度** の設計。DB 変更なし(全モック)。
> 既定値は `docs/SALES_PERF_MOCK_DEFAULTS.md` を正とする。

---

## 0. 結論(3行)

1. **隔離実装**。既存 `Policy`/`SalesTarget`/簡易ダッシュ(`/dashboard`)には一切触れず、`src/features/salesPerf/` に新サブシステムを丸ごと構築。サイドメニューに独立エントリ「営業実績」を追加。
2. **チャートは recharts 追加を推奨・採用OK**(デモ品質優先)。ファネル/ヒートテーブルのみ自作(recharts に無い or 自作が速い)。
3. 集計は単一モジュール `salesPerfMetrics.ts` に完全集約(実 API 差替を見据える)。正規化は `contractNormalize.ts`。

---

## 1. 方針: 隔離実装 vs タブ追加

### 決定: **隔離実装**（`src/features/salesPerf/`）

理由:
- v1 の `contracts`(30列超) / `targets`(line×fy×scope×month) は、既存 `Policy` / `SalesTarget` とデータモデルが **別物**。既存型に混ぜると既存ダッシュ・商談・契約画面が壊れるリスク大。
- 既存 `/dashboard`(個人/チームタブ、`SalesTarget`+12カード)は温存。デモ中に既存機能を壊さない。
- 実 API 差替時、`salesPerf` フォルダごと差し替えれば済む(集計・正規化・型・seed が同居)。

### ルーティング & 導線(デモで見せる線)

- サイドメニュー(`AppShell.tsx` NAV_ITEMS)に **1 エントリ追加**:
  - `{ to: '/sales-perf', icon: TrendingUp, label: '営業実績', roles: ['general','manager','executive','admin'] }`
  - 既存 `ダッシュボード`(`/dashboard`)の直下に配置。
- ルート: `/sales-perf` 配下に 7 画面をタブ(またはサブナビ)で切替。**単一ルート + 内部タブ**方式(URL は `?screen=s1` 等で保持、フィルタ状態も querystring or Zustand slice で画面間保持)。
  - `App.tsx` に `<Route path="/sales-perf" element={<SalesPerfPage />} />` を **1 行追加**するのみ。
- 権限: `roles` は全ロール可視だが、画面内 scope とフィルタは権限で絞る(担当は担当者切替フィルタ非表示)。

---

## 2. 型 / store / 集計モジュール構成

すべて `src/features/salesPerf/` 配下。既存 `src/types/index.ts` には **追記しない**(隔離)。ただし `User`/`Team`/`Role` は既存型を import 再利用。

```
src/features/salesPerf/
├─ types.ts                 # SalesContract, SalesTargetRow, マスタ, 確度, フィルタ状態, 集計結果
├─ constants.ts             # 会計年度定義, 確度ラダー, LP目標=7, 損保目標=55.7M 等の可変定数
├─ data/
│  ├─ masters.ts            # 担当者/グループ/保険会社/種目/チャネル マスタ(架空名)
│  └─ seedContracts.ts      # contracts 200〜500行(欠損/異常値を意図的に混入) + targets
├─ store.ts                 # Zustand: フィルタ状態 + データ(masters/contracts/targets)を保持
├─ lib/
│  ├─ contractNormalize.ts  # 文字列金額→数値+単位, 日付年度整合, 確度正規化, 欠損→未分類
│  ├─ salePerfScope.ts      # 権限 scope 解決(既存 getScopeUsers を拡張/流用)
│  ├─ salesPerfMetrics.ts   # 全KPI・全集計(純関数, 単一集約)。分母0→null(表示側で"−")
│  └─ format.ts             # 円/百万円丸め, %, "−"表示, #DIV/0!握りつぶし
├─ components/
│  ├─ GlobalFilterBar.tsx   # 全画面共通フィルタ(画面間保持)
│  ├─ DataQualityBadge.tsx  # 集計n件/要確認m件 常時表示
│  ├─ KpiCard.tsx           # KPIカード(達成=緑/未達=赤)
│  ├─ charts/
│  │  ├─ LineBudgetActual.tsx    # 月次手数料×予算(recharts LineChart)
│  │  ├─ StackedConfidenceBar.tsx# 確度別積上げ棒(recharts BarChart stacked)
│  │  ├─ RankingBar.tsx          # 担当者進捗ランキング横棒(recharts BarChart layout=vertical)
│  │  ├─ CumulativeCombo.tsx     # 累計予算vs確定累計コンボ(recharts ComposedChart)
│  │  ├─ FunnelChart.tsx         # ファネル(★自作 SVG)
│  │  └─ HeatTable.tsx           # 担当者比較ヒートテーブル(★自作: セル背景で濃淡)
│  └─ screens/
│     ├─ S1Summary.tsx
│     ├─ S2BudgetTarget.tsx
│     ├─ S3Process.tsx
│     ├─ S4Channel.tsx
│     ├─ S5InsurerType.tsx
│     ├─ S6LifePlan.tsx
│     └─ S7ContractDetail.tsx
└─ SalesPerfPage.tsx        # ルート: サブナビ(S1〜S7タブ) + GlobalFilterBar + DataQualityBadge

src/App.tsx                 # <Route path="/sales-perf" .../> 1行追加
src/components/layout/AppShell.tsx  # NAV_ITEMS に1行追加
package.json                # recharts 追加
```

### 2.1 型(`types.ts`) — 実装直行スケッチ

```ts
export type SalesLine = 'life' | 'nonlife';          // 生保/損保
export type LineFilter = 'life' | 'nonlife' | 'both'; // フィルタ: 両方あり

// 確度: 生保/損保で別ラダー。共通集約軸は3値
export type ConfidenceLife    = 'fixed' | 'S' | 'A' | 'B' | 'first'; // 確定/S/A/B/初見
export type ConfidenceNonlife = 'fixed' | 'S' | 'A' | 'B' | 'C' | 'D';
export type ConfidenceCode = ConfidenceLife | ConfidenceNonlife;
export type ConfidenceAgg = 'fixed' | 'fixed_s' | 'fixed_s_a'; // 確定 / 確定+S / 確定+S+A

export interface SalesContractRaw {   // seed の生データ(汚れを含む)
  id: string;
  line: SalesLine;
  fiscal_year: number;               // 2025
  owner_id: string;                  // User.id
  group_id?: string;
  channel: string;                   // チャネル(提携先経由 等)
  partner: string;                   // 提携先
  insurer: string;                   // 保険会社
  product_type: string;              // 種目
  monthly_premium: string | number;  // ★文字列混在("500万円","22000ドル")→正規化必須
  first_year_commission: string | number; // ★金額基準。同上
  confidence: string;                // 表記ゆれあり→正規化
  application_date?: string;         // 申込日
  established_date?: string;         // 成立/計上日(YYYY-MM-DD) ★確定判定・月次集計の基準
  // S3プロセス用フラグ(件数計上)
  had_meeting?: boolean;             // 商談
  had_lifeplan?: boolean;            // LP実施(生保)
  policy_collected?: boolean;        // 証券回収
  had_proposal?: boolean;            // 提案
  household_id?: string;             // 契約世帯(世帯数集計)
  // ...仕様30列に応じ随時追加。未確定列は optional
}

export interface SalesContract {       // 正規化後(集計はこれを使う)
  id: string;
  line: SalesLine;
  fiscalYear: number;
  ownerId: string;
  groupId?: string;
  channel: string;
  partner: string;
  insurer: string;
  productType: string;
  monthlyPremium: number | null;       // 変換不能=null(要確認)
  firstYearCommission: number | null;  // 同上
  confidenceCode: ConfidenceCode | 'unknown';
  confidenceAgg: ConfidenceAgg | null; // fixed/S/A のいずれか以下に集約
  establishedDate: string | null;      // 年度不整合=null(要確認)
  month: number | null;                // established_date から算出(会計月 4-3)
  hadMeeting: boolean;
  hadLifeplan: boolean;
  policyCollected: boolean;
  hadProposal: boolean;
  householdId: string;
  _issues: string[];                   // データ検疫フラグ("premium_unparseable"等)。要確認判定に使用
}

export interface SalesTargetRow {
  line: SalesLine;
  fiscalYear: number;
  scopeType: 'all' | 'group' | 'individual';
  scopeId: string;                     // all→'ALL', group→group_id, individual→owner_id
  month: number;                       // 1-12 (会計月 or 暦月。constants で定義)
  amount: number;                      // 予算(手数料ベース)
}

export interface SalesPerfFilter {     // グローバルフィルタ(画面間保持)
  line: LineFilter;
  fiscalYear: number;
  periodMode: 'full' | 'h1' | 'h2' | 'single';
  singleMonth?: number;
  ownerId?: string;                    // 担当者(担当ロールは非表示・自分固定)
  groupId?: string;
  confidenceScenario: ConfidenceAgg;   // 確定/確定+S/確定+S+A
  insurer?: string;
  productType?: string;
  channel?: string;
}
```

### 2.2 集計モジュール(`salesPerfMetrics.ts`) — 純関数群(単一集約)

すべて `(contracts: SalesContract[], targets: SalesTargetRow[], filter: SalesPerfFilter, masters)` を入力に取る純関数。**分母0は `null` を返し、表示側で `"−"`**。

- `applyFilter(contracts, filter, scope)` → フィルタ済み contracts
- `kpiSummary()` → 年間予算/確定手数料/進捗率/目標差額/前年比 (S1カード)
- `monthlyCommissionVsBudget()` → 月次折れ線データ (S1/S2)
- `stackedByConfidence()` → 確度別積上げ (S1)
- `ownerRanking()` → 担当者進捗ランキング (S1)
- `budgetTable()` → 月×(確定/確定+S/確定+S+A/進捗率/予算/予算積上げ) (S2)
- `cumulativeBudgetVsActual()` → 累計コンボ (S2)
- `funnelMetrics()` → 商談→LP→証券回収→提案→契約世帯→契約件数 + 転換率 (S3)
- `ownerFunnelHeat()` → 担当者比較ヒートテーブル (S3)
- `channelBreakdown()` → 提携先別件数+構成比 (S4)
- `insurerTypeBreakdown(mode:'commission'|'count')` → (S5)
- `lifePlanMetrics()` → 生保のみ・チャネル別LP実施vs目標(月7件) (S6)
- `contractRows()` → 明細(1契約1行) + 要確認フラグ (S7)
- `dataQuality()` → { total, needsReview } (常時バッジ)

**KPI式(仕様準拠)**: 進捗率=確定累計÷予算積上げ / 目標差額=実績−予算 / LP率=LP数÷商談数 / 契約率=契約世帯数÷提案数 / 1世帯単価=手数料÷契約世帯数。**分母0→`null`→"−"表示**(`#DIV/0!` 握りつぶし)。

### 2.3 正規化(`contractNormalize.ts`)

- `parseAmount(raw)`: "500万円"→5_000_000 / "22000ドル"→変換不能(`_issues:['premium_unparseable']`, null) / カンマ・全角除去 / 純数値はそのまま。
- `normalizeConfidence(raw, line)`: 表記ゆれ→ConfidenceCode。生保/損保で別マップ。→ confidenceAgg 算出。
- `resolveMonth(establishedDate, fiscalYear)`: 年度不整合(fy 外)→null + `_issues:['fy_mismatch']`。
- 必須欠損(insurer/channel/productType 空)→`'未分類'` + `_issues`。
- `normalizeAll(raw[])`: 生→SalesContract[]。`_issues.length>0` は要確認扱い(集計除外は金額系のみ、件数系は可能な範囲で計上)。

### 2.4 scope 解決(`salePerfScope.ts`)

- 既存 `getScopeUsers(role, userId, users, teams)`(`src/utils/salesMetrics.ts`)を **import 流用**。
- salesPerf は独自グループマスタ(G1/G2/管理)を持つため、`getScopePredicate(role, userId, filter, masters)` で「見えるowner集合」を算出し `applyFilter` に渡す。担当ロール: 自分のみ・担当者切替フィルタ非表示(GlobalFilterBar が role で出し分け)。

### 2.5 store(`store.ts`)

- **既存 `src/store/index.ts` は触らない**。salesPerf 専用の軽量 Zustand ストア `useSalesPerfStore` を新設(フィルタ状態 + masters/contracts/targets 保持)。
- `filter` の setter 群 + `resetFilter`。データは seed から初期化(localStorage 永続化は不要=デモ)。
- 現在ユーザー/ロールは既存 `useAppStore` から読む(scope 用)。

---

## 3. 7画面 + フィルタ コンポーネント一覧

| 画面 | ファイル | 主要素 | 使う集計 | チャート |
|---|---|---|---|---|
| 共通 | `GlobalFilterBar.tsx` | 商品ライン/年度/期間/担当者・グループ/確度シナリオ/保険会社/種目/チャネル。AND・件数常時表示。担当は担当者切替非表示 | `applyFilter` | — |
| 共通 | `DataQualityBadge.tsx` | 集計n件 / 要確認m件 | `dataQuality` | — |
| S1 | `S1Summary.tsx` | KPIカード5種 + 月次折線 + 確度積上げ + 担当ランキング | `kpiSummary`/`monthlyCommissionVsBudget`/`stackedByConfidence`/`ownerRanking` | Line, StackedBar, RankingBar |
| S2 | `S2BudgetTarget.tsx` | 月×指標テーブル + 累計コンボ + 差額バー | `budgetTable`/`cumulativeBudgetVsActual` | Combo, Bar |
| S3 | `S3Process.tsx` | ファネル + 転換率 + 担当者比較ヒート | `funnelMetrics`/`ownerFunnelHeat` | ★FunnelChart, ★HeatTable |
| S4 | `S4Channel.tsx` | 提携先別件数 + 構成比 | `channelBreakdown` | Bar + (構成比は Bar/Pie) |
| S5 | `S5InsurerType.tsx` | 保険会社・種目 手数料/件数トグル | `insurerTypeBreakdown` | Bar(トグル) |
| S6 | `S6LifePlan.tsx` | 生保のみ・チャネル別LP実施vs目標(月7件) | `lifePlanMetrics` | Bar(実績vs目標線) |
| S7 | `S7ContractDetail.tsx` | 1契約1行テーブル + 要確認ハイライト + フィルタ連動 | `contractRows` | — (テーブル) |

- `KpiCard.tsx`: 達成緑/未達赤、百万円丸めトグル対応、値が null→"−"。
- チャート共通: recharts。色トークンは Tailwind 系(既存 UI に馴染む blue/green/red/gray)。

---

## 4. 実装タスク分解(coder 向け・順序付き・並列束)

> デモ最短動線: **T0基盤 → S1 → フィルタ → S2 → S3 → S7 → (S4/S5/S6 並列)**。
> 各 coder タスクは `db-migration-safety` 不要(DB変更なし)、`ui-design-standards` 必読、`testing-standards` 準拠(集計は純関数=Vitest 必須)。

### フェーズ P0: 基盤(直列・最優先) — 1 coder

- **T0-1 型 & 定数**: `types.ts` / `constants.ts`(会計年度=4-3, 上期4-9/下期10-3, 既定FY2025, LP目標7, 損保目標55.7M, 確度ラダー2種, 確度→Agg マップ)。
  - 完了条件: `tsc` 通過。型 export 完備。
- **T0-2 マスタ & seed**: `data/masters.ts`(担当7名=架空名/G1G2管理/保険会社/種目/チャネル)、`data/seedContracts.ts`(contracts **300行**目安、2ライン通年、欠損/異常値=金額文字列"500万円"/"22000ドル"・fy不整合・確度表記ゆれを 5〜10% 混入。targets=line×fy×scope×month)。
  - 完了条件: seed が型に適合、300行生成、意図的汚れ ≥15件。
- **T0-3 正規化**: `lib/contractNormalize.ts` + Vitest。
  - 完了条件: "500万円"→5000000、"22000ドル"→null+issue、fy不整合→null+issue、欠損→"未分類"。テスト緑。
- **T0-4 集計コア**: `lib/salesPerfMetrics.ts`(全関数のシグネチャ + S1系実装優先) + `lib/format.ts` + `lib/salePerfScope.ts`。分母0→null。Vitest(kpiSummary/進捗率/前年比/scope)。
  - 完了条件: S1 が必要とする集計が緑。他関数はスタブ可(後続で埋める)。
- **T0-5 ルーティング & 骨組み**: `SalesPerfPage.tsx`(S1〜S7 サブナビ+空タブ)、`store.ts`(filter)、`App.tsx`/`AppShell.tsx` 各1行追加、`package.json` に **recharts** 追加 + `npm i`。
  - 完了条件: `/sales-perf` が開きサブナビ切替可。ビルド通過。

### フェーズ P1: 中核画面(P0後・一部並列) — 2 coder

- **T1-1 GlobalFilterBar + DataQualityBadge + KpiCard**(共通部品)。フィルタ→store→再集計。担当ロールで担当者切替非表示。
  - 完了条件: フィルタ変更が全画面に反映、件数/要確認バッジ表示。
- **T1-2 S1 サマリー**(charts: Line/StackedBar/RankingBar 込み)。★T1-1 と同 coder が連続で。
  - 完了条件: 5KPI・3チャート表示、フィルタ連動。
- **T1-3 S2 予算・目標**(budgetTable + CumulativeCombo + 差額バー)。T0-4 の S2 集計を埋める。並列可(別 coder)。
  - 完了条件: 月×指標テーブル + 累計コンボ + 差額バー、進捗率"−"表示確認。

### フェーズ P2: プロセス & 明細(P1後) — 2 coder 並列

- **T2-1 S3 プロセス**(★FunnelChart 自作 + 転換率 + ★HeatTable 自作 + `funnelMetrics`/`ownerFunnelHeat` 実装)。
  - 完了条件: ファネル6段 + 転換率 + 担当ヒート、LP率/契約率の"−"確認。
- **T2-2 S7 契約明細**(`contractRows` + テーブル + 要確認ハイライト + フィルタ連動 + 列ソート)。
  - 完了条件: 1契約1行、要確認行が視覚区別、フィルタ即連動。

### フェーズ P3: 分析3画面(P2後・完全並列) — 3 coder 並列

- **T3-1 S4 チャネル分析**(`channelBreakdown`: 件数+構成比)。
- **T3-2 S5 保険会社・種目分析**(`insurerTypeBreakdown`: 手数料/件数トグル)。
- **T3-3 S6 ライフプラン実績**(生保のみ・チャネル別LP実施 vs 目標月7件)。
  - 各完了条件: 該当集計実装 + チャート + フィルタ連動。

### フェーズ P4: 仕上げ — 1 coder + doc_keeper

- **T4-1** 百万円丸めトグル全画面反映、達成緑/未達赤の色統一、エクスポートボタン(非活性・将来用)、レスポンシブ確認。
- **T4-2 doc_keeper**: `DATA_MODEL.md`/`UI_SPEC.md`/`PHASE_ROADMAP.md` に salesPerf サブシステムを追記。

### 並列束サマリ

```
P0 (直列, 1名): T0-1 → T0-2 → T0-3 → T0-4 → T0-5
P1 (P0後):      [T1-1→T1-2] 同一名  ||  T1-3 別名
P2 (P1後):      T2-1 || T2-2
P3 (P2後):      T3-1 || T3-2 || T3-3
P4 (P3後):      T4-1 → T4-2(doc)
```

---

## 5. 影響 / リスク

| 項目 | 影響/リスク | 対策 |
|---|---|---|
| 既存機能 | **なし**(隔離実装。既存 store/types/pages 不変) | `App.tsx`/`AppShell.tsx` は追記1行のみ。差分レビュー容易 |
| recharts 追加 | bundle 増・依存追加 | デモ品質優先で採用OK(御下命)。ファネル/ヒートは自作で lib 依存最小化 |
| React 19 + recharts | **確認済み実リスク**: recharts 2.x は React 19 で `react-is` を 19 に override しないとチャートが描画されない(dots のみ表示等)。 | **recharts 3.x を採用**(React 19 を peerDeps に含む・override 不要)。3.x が不可なら 2.15.x + `package.json` の `overrides: { "react-is": "^19.0.0" }` + `npm i --legacy-peer-deps`。それでも不安定なら軽量 SVG 自作に切替(集計は不変=画面差替のみ)。T0-5 で `npm run build` + 実描画をブラウザ確認するまで完了としない。 |
| データ検疫 | 変換不能値の集計方針が曖昧だと数値がぶれる | 金額系 null は集計除外+要確認件数明示、件数系は可能な範囲で計上。方針を `salesPerfMetrics` 冒頭 JSDoc に明記 |
| 確度2ラダー | 生保/損保で S/A/B 意味違い→混同 | 共通軸(確定/確定+S/確定+S+A)で集計、単一ライン時のみ詳細コード表示。マップは constants に集約 |
| 会計年度 | 既存 `salesPeriod.ts` は `FISCAL_START_MONTH=1`(暦年)。v1 は4月始まり | salesPerf は **独自の会計月ロジック**を constants に持つ(既存を書き換えない=隔離維持) |
| 架空名 | 既存 seed の霧島 遥 等と担当者マスタが別実体 | salesPerf は独自 owner マスタ(既定doc の7名)。既存 USERS とは id を分離 or マッピング表を masters に持つ |
| scope 流用 | 既存 `getScopeUsers` は既存 USERS/TEAMS 前提 | salesPerf の owner マスタに合わせ `salePerfScope.ts` で薄くラップ(既存関数は温存) |
| 実API差替 | 将来 Supabase 等へ | 集計/正規化/型/seed が `features/salesPerf/` に同居。API 差替は store のデータ取得部のみ差替で済む設計 |

---

## 付記: coder への spawn 指示テンプレ（各タスク冒頭に必須）

> 作業前に `projects/305.../STATUS.md` と本書 §2〜4 を読め。`ui-design-standards`/`testing-standards` 必読。
> 既存 `src/types/index.ts`・`src/store/index.ts`・`/dashboard` 系は **触るな**(隔離)。
> 集計は純関数、分母0→null→"−"。憶測禁止・実コードで裏取り。DB変更なし。
