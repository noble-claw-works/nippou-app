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

## TimelinePanel (`src/components/today/TimelinePanel.tsx`)

**役割**: Today ページの 2 列タイムライン（予定列・実績列）の描画。編集・ドラッグ&ドロップ対応。

詳細は `UI_SPEC.md` の `TimelinePanel` セクションを参照。

### ReadOnlyTimeline との対称性

`ReadOnlyTimeline (variant='all')` は `TimelinePanel` と同じカラム構成・カラーリングを採用しており、Today ページと確認用画面で一貫した UX を提供する。

| 要素 | TimelinePanel (Today) | ReadOnlyTimeline (確認用) |
|---|---|---|
| ブレークポイント | sm (640px) | sm (640px) |
| 予定カラム色 | indigo | indigo |
| 実績カラム色 | emerald | emerald |
| ヘッダーラベル | 「◀ 予定 \| 実績 ▶」 | 「◀ 予定 \| 実績 ▶」 |
| 時刻軸幅 | 36px | 40px |
| 編集可否 | ✅ 編集可（D&D 対応） | ❌ 読み取り専用 |
