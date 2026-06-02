# UIコンポーネント仕様

## 概要

nippou-app の Today ページは以下のコンポーネントに分割されています。

---

## ページ構成

```
TodayPage (src/pages/TodayPage.tsx)
├── TrackingBanner        （タイムトラッキング中バナー）
├── StatusBadge           （日報ステータス表示）
├── TimelinePanel         （タイムライン 2列）
│   ├── BlockCard         （ブロック表示）
│   ├── DragGhost         （D&C 仮ブロック）
│   └── ChipPopover       （種別選択ポップオーバー）
├── SidePanelCards        （サイドパネル）
│   ├── TodoCard          （TODO リスト）
│   ├── CustomerSummaryCard（顧客対応サマリー）
│   ├── ReflectionCard    （振り返り: 気分・上長合図）
│   ├── ThemeCard         （テーマ入力）
│   └── GratitudeCard     （感謝3件入力）
├── StatusBar             （下部ステータスバー）
└── BlockModal            （ブロック追加・編集モーダル）
```

---

## コンポーネント詳細

### TodayPage (`src/pages/TodayPage.tsx`)

**役割**: オーケストレーター。State管理、hooks、ハンドラー関数を保持。

**行数**: 261行

**State**:
- `report`: 今日の DailyReport
- `blockModal`: BlockModalState
- `showStartModal/showSubmitModal/showTrackModal`: モーダル表示フラグ
- `showLongBlock`: 長時間ブロック確認ダイアログ
- `trackType/trackCustomer/elapsedSecs`: トラッキング関連

**Hooks**:
- `useDragAndChip` × 2 (予定列・実績列)
- `useBlockDrag` (ブロック移動・リサイズ)
- `useIsMobile` (レスポンシブ判定)

---

### TimelinePanel (`src/components/today/TimelinePanel.tsx`)

**役割**: 2列タイムライン（予定列・実績列）の描画。

**行数**: 340行

**Props**:
```typescript
interface TimelinePanelProps {
  report: DailyReport;
  customers: Customer[];
  blockDragState: BlockDragState | null;
  startDrag: (e, blockId, mode, origStart, origEnd, col?) => void;
  plannedDnC: UseDragAndChipResult;
  actualDnC: UseDragAndChipResult;
  isMobile: boolean;
  onOpenBlock: (block?, col?) => void;
  onActualize: (block: TimeBlock) => void;
  onPlannedChipSelected: (type: BlockType) => void;
  onPlannedDragWithoutType: () => void;
  onActualChipSelected: (type: BlockType) => void;
  onActualDragWithoutType: () => void;
}
```

**機能**:
- 時刻軸（6:00〜22:30）
- 予定列（indigo）・実績列（emerald）
- ドラッグ&ドロップによるブロック移動・リサイズ
- D&C による新規ブロック作成（ドラッグ後に ChipPopover を表示）
- visit ブロックに集金済み・次回AP バッジ表示
- 予定列ブロックにホバーで「✅ 実績化」ボタン表示

---

### BlockModal (`src/components/today/BlockModal.tsx`)

**役割**: ブロック追加・編集モーダル。

**行数**: 253行

**Props**:
```typescript
interface BlockModalProps {
  state: BlockModalState;
  customers: Customer[];
  continueInput: boolean;
  setContinueInput: (v: boolean) => void;
  onSave: () => void;
  onDelete: (blockId: string) => void;
  onClose: () => void;
  onChange: (updater: (prev: BlockModalState) => BlockModalState) => void;
}
```

**機能**:
- 時刻範囲入力（開始・終了）
- アクティビティ種別チップ選択
- 顧客セレクト
- タイトル・メモ入力
- **visit 選択時のみ** 訪問結果エリアを展開表示：
  - 集金済みチェックボックス
  - 次回アポイント日入力
  - 提案内容入力
  - 対応結果メモ入力
- 保存して続けて入力チェックボックス

---

### SidePanelCards (`src/components/today/SidePanelCards.tsx`)

**役割**: 右サイドパネルの全カードをまとめるコンテナ。

**行数**: 281行

**Props**:
```typescript
interface SidePanelCardsProps {
  report: DailyReport;
  customers: Customer[];
  onUpdateReport: (updates: Partial<DailyReport>) => void;
  onAddTodo: (text: string) => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}
```

**内部コンポーネント**:

#### TodoCard
- TODO リスト表示・追加・完了トグル・削除

#### CustomerSummaryCard
- visit ブロックから訪問結果を集約して表示
- 集金バッジ、次回APバッジ、提案内容バッジ
- 非 visit の顧客対応も下部に表示

#### ReflectionCard
- 朝/夜の気分（☀️ 🌤️ ☁️ 🌧️）
- 上長への合図（💬 相談・👂 聞いて・👍 大丈夫）

#### ThemeCard
- 今日のテーマ・今月のテーマ入力

#### GratitudeCard
- 感謝3件 テキスト入力

---

### TrackingBanner (`src/components/today/TrackingBanner.tsx`)

**役割**: タイムトラッキング中に上部に表示するバナー。

**行数**: 36行

**Props**:
```typescript
interface TrackingBannerProps {
  session: TrackingSession;
  customers: Customer[];
  elapsed: number;        // 経過秒数
  onStop: () => void;
  onDiscard: () => void;
}
```

---

### StatusBar (`src/components/today/StatusBar.tsx`)

**役割**: 下部ステータスバー。自動保存表示、ステータスステッパー、提出ボタン。

**行数**: 83行

**Props**:
```typescript
interface StatusBarProps {
  report: DailyReport;
  onShowSubmit: () => void;
  onWithdraw: () => void;
}
```

---

## デザイントークン

| 用途 | カラー |
|---|---|
| 予定列 | indigo (indigo-50/20 bg, indigo-600 text) |
| 実績列 | emerald (emerald-50/20 bg, emerald-600 text) |
| visit ブロック | blue-100 border-blue-400 text-blue-800 |
| 集金バッジ | green-50 border-green-200 text-green-700 |
| APバッジ | blue-50 border-blue-200 text-blue-700 |
| 提案バッジ | purple-50 border-purple-200 text-purple-700 |

---

## アクセシビリティ

- ChipPopover: `role="dialog"` + `aria-label`
- キーボード操作: 1〜7キーで種別選択、Enterで確定、Escでキャンセル
- ユーザー入力はすべて React JSX 経由（`dangerouslySetInnerHTML` 不使用）
