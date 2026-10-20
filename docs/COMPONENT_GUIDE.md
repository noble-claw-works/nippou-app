# コンポーネント実装ガイド — 目次

305 nippou-app のコンポーネント実装ガイドは以下のドキュメントに分冊されています。

**最終更新**: 2026-06-09（Phase 3 完了）

## 分冊一覧

| ファイル | トピック | 説明 |
|---|---|---|
| **COMPONENT_GUIDE.md** (この目次) | 共通コンポーネント | ReadOnlyTimeline・ReportDetailPage・TimelinePanel・AdminPage 関連・基礎コンポーネント |
| **COMPONENT_GUIDE_phase1-household.md** | Phase 1: 世帯管理コンポーネント | PersonEditModal・HouseholdsPage・HouseholdDetailPage・CustomerCombobox |
| **COMPONENT_GUIDE_phase2-opportunity.md** | Phase 2: 商談案件コンポーネント | StageBadge・StageSelector・OpportunityCombobox・QuickOpportunityModal・ProposalProductEditModal |
| **COMPONENT_GUIDE_phase3-policy.md** | Phase 3: 保険契約コンポーネント | PolicyStatusBadge・CoverageMatrix・PolicyEditModal・CoverageEditModal・QuickPolicyIssueModal |

## 概要

本ガイドは以下を対象としています:

1. **コンポーネント実装の仕様書** — Props, State, 内部ロジック
2. **UI デザイン詳細** — 色・スペーシング・レイアウト (Tailwind CSS クラスで指定)
3. **ビジネスロジック** — バリデーション・権限制御・連携方法
4. **テスト・a11y** — アクセシビリティ要件

## 共通コンポーネント（全フェーズ共通）

### ReadOnlyTimeline
- **目的**: 日報のタイムライン（予定・実績）を読み取り専用で表示
- **使用例**: ReportDetailPage / 日報検索結果
- **主要 Props**: blocks / customers / variant
- **ビジュアル**: 2 カラム (sm 以上) または 縦積み (モバイル)

### TimelinePanel
- **目的**: Today ページの 2 列タイムライン（予定・実績・ドラッグ可能）
- **主要機能**: D&D によるブロック移動・リサイズ・新規作成
- **インタラクション**: 予定列から実績列への実績化ボタン

---

関連ドキュメント:
- `docs/COMPONENT_GUIDE_phase1-household.md`: Household コンポーネント
- `docs/COMPONENT_GUIDE_phase2-opportunity.md`: Opportunity コンポーネント
- `docs/COMPONENT_GUIDE_phase3-policy.md`: Policy コンポーネント
- `docs/UI_SPEC.md`: UI 全体設計
- `docs/DATA_MODEL.md`: データモデル
# コンポーネントガイド

このドキュメントは主要コンポーネントのレスポンシブ挙動・Props・テスト仕様を記載する補足リファレンスです。
詳細な UI 仕様は `UI_SPEC.md` を参照してください。

---

## ReadOnlyTimeline (`src/components/report/ReadOnlyTimeline.tsx`)

**役割**: 確認用画面 (`/reports/:date`) のタイムライン読み取り専用表示。Today ページの `TimelinePanel` と同じビジュアル原則を採用。

### Props

```typescript
interface Props {
  blocks: TimeBlock[];
  customers: Customer[];
  /** 表示するブロックのフィルタ条件: 全 / 予定のみ / 実績のみ */
  variant?: 'all' | 'planned' | 'actual';
}
```

### variant 別レイアウト

| variant | レイアウト | 用途 |
|---|---|---|
| `'all'`（デフォルト） | 「◀ 予定 \| 実績 ▶」2 カラム並列 | 確認用画面 `/reports/:date` |
| `'planned'` | 単一カラム（予定ブロックのみ） | 将来用履歴ビュー等 |
| `'actual'` | 単一カラム（実績ブロックのみ） | 将来用履歴ビュー等 |

### レスポンシブブレークポイント (variant='all')

| 画面幅 | ブレークポイント | レイアウト |
|---|---|---|
| **sm 以上** | `≥640px` (`sm:` prefix) | 横並び 2 列: 時刻軸 40px + 予定 1fr + 1px セパレータ + 実績 1fr |
| **sm 未満** | `<640px` | 縦積み: 予定（上）→ 実績（下）の順 |

> **注意**: 以前は md ブレークポイント (768px) を使用していたが、主上ご指摘により sm (640px) に統一（BUG-A 真の修正 commit 94ed85b）。

### 内部コンポーネント

| コンポーネント | 役割 |
|---|---|
| `ReadOnlyTimelineColumn` | 予定 or 実績の単一カラム描画（`kind: 'planned' \| 'actual'`）|
| `SingleColumnTimeline` | `variant='planned'\|'actual'` 時の後方互換単一カラム |
| `TimeGrid` | 時刻グリッド線 + ラベル（1 時間ごと）|
| `BlockBar` | ブロック矩形（型別カラー、メモ表示、顧客名）|
| `GapBar` | スキマ時間表示（amber 破線縦バー）|

### カラーリング

| カラム | テーマカラー | 背景クラス |
|---|---|---|
| 予定 | indigo | `bg-indigo-50/20` |
| 実績 | emerald | `bg-emerald-50/20` |

### e2e テスト用 data-testid

| testid | 対象要素 |
|---|---|
| `timeline-planned-col` | デスクトップ時の予定カラム div |
| `timeline-actual-col` | デスクトップ時の実績カラム div |

e2e テスト: `e2e/buga-layout.spec.ts` で予定/実績横並び確認テストを実施。

### ヘッダー構成

コンポーネント内部に以下を保持（ReportDetailPage 側の外側ラッパーは不要）:
- 「📅 タイムライン」見出し
- 「🎨 凡例」トグルボタン
- 「◀ 予定（計画したこと）」「実績（実際にやったこと）▶」説明バー（sm 以上のみ表示）

### 改修履歴

| commit | 内容 |
|---|---|
| `94ed85b` (2026-06-06) | BUG-A 真の修正 — Today と同じ 2 カラム並列レイアウトに統一。sm ブレークポイント採用、ヘッダーをコンポーネント内部化 |
| `b4ec6c8` (2026-06-06) | BUG-A 中間対応 — md ブレークポイントで 2 列化（主上ご指摘により 94ed85b で再修正）|
| RPT-2 初期実装 | 縦軸ピクセルタイムライン読み取り専用表示として実装 |

---

