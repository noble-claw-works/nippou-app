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
│   ├── ThemeCard         （3段テーマ入力）
│   ├── ComplimentsCard   （お褒め・要望記録）
│   └── GratitudeCard     （感謝3件入力）
├── ManagerCommentSection （上長コメント・返答）
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

### BlockCard (`src/components/today/BlockCard.tsx`)

**役割**: タイムラインに表示される個別ブロック。ドラッグ対応、メモ表示。

**行数**: 96行

**機能**:
- ブロックのビジュアル表示（型別カラーリング）
- マウスドラッグでの位置・高さ調整
- タイトル + 時刻 + visit 結果バッジ
- **メモ表示**: `block.memo` を `text-xs text-gray-500 line-clamp-2` で表示
  - ブロック高さ ≥40px の場合のみ表示
  - 📝 プリフィックス付き
- 実績化ボタン（高さ ≥32px の場合表示）

---

### BlockModal (`src/components/today/BlockModal.tsx`)

**役割**: ブロック追加・編集モーダル。バリデーション + 訪問結果アコーディオン。

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

**バリデーション機能** (M-2 UX修正):
- 必須項目: 「種別 *」「開始時刻 *」「終了時刻 *」に赤マーカー
- 種別未選択時の保存: ボタン群に赤枠 + 「必須項目です」インラインエラー、モーダルは閉じない
- 時刻逆転時: 「終了時刻は開始時刻より後である必要があります」エラー
- 種別選択時にエラー自動クリア

**訪問結果セクション** (W-2 UX修正):
- visit 選択時のみ、アコーディオン「🤝 訪問結果」を展開可能
- ChevronDown/ChevronRight で開閉
- 内部フィールド:
  - 集金済みチェックボックス
  - 次回アポイント日入力
  - 提案内容入力
  - 対応結果メモ入力
- モーダル全体に `max-h-[60vh] overflow-y-auto` を適用

**その他**:
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
  onAddTodo: (text: string, priority?: 'high' | 'medium' | 'low') => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}
```

**内部コンポーネント**:

#### TodoCard
- TODO リスト表示・追加・完了トグル・削除
- **ステータス機能** (P1-2 実装):
  - 左ステータスアイコン: `todo=☐` / `doing=◐` / `done=☑`
  - クリックで `todo → doing → done → todo` 巡回
  - 中央: 本文（done は打消線）
  - 右: 優先度バッジ + 期限表示
- **優先度バッジ**: 
  - `high=🔥赤` / `medium=⭐黄` / `low=💧青`
  - テキストラベルで表示
- **期限表示**: 
  - `〜MM/DD` 形式
  - 超過時は赤文字 (isOverdue)
  - 当日は amber, 通常は gray
- **完了済み TODO**: `<details>/<summary>` で折りたたみ表示「完了済み N件」
- **インライン追加**: +ボタンで入力欄展開、priority/dueDate も同時設定可能

#### CustomerSummaryCard
- visit ブロックから訪問結果を集約して表示
- 集金バッジ、次回APバッジ、提案内容バッジ
- 非 visit の顧客対応も下部に表示

#### ReflectionCard
- 朝/夜の気分（☀️ 🌤️ ☁️ 🌧️）
- 上長への合図（💬 相談・👂 聞いて・👍 大丈夫）

#### ThemeCard (P1-1 実装)
- **3段レイアウト**:
  - 📌 メインテーマ（中長期）
  - 今日のテーマ（本日）
  - 今月のテーマ（月間）
- 各フィールドはテキスト入力
- 入力状況で「✓ 入力済」/ 「未入力」ステータス表示

#### ComplimentsCard (P0-2 実装)
- 新規コンポーネント: `src/components/today/ComplimentsCard.tsx` (111行)
- SidePanelCards.tsx 行379 で配置
- **表示**:
  - dayKey（YYYY-MM-DD）でフィルタリング
  - 各エントリ: 区分（📝 お褒め / 💡 要望）+ 顧客名 + 本文
- **入力**（提出前のみ有効）:
  - 顧客セレクト（プルダウン or 自由入力）
  - 区分選択（お褒め/要望 ラジオ）
  - 本文テキスト
  - 「+追加」ボタン
- **削除**: 非 readOnly 時のみ可能
- 提出後は読取専用

#### GratitudeCard
- 感謝3件 テキスト入力

---

### ManagerCommentSection (`src/components/today/ManagerCommentSection.tsx`)

**役割**: 上長コメント・返答の表示・管理。

**行数**: 67行

**Props**:
```typescript
interface Props {
  dayKey: string;           // YYYY-MM-DD
  submitted: boolean;       // report.submitted フラグ
}
```

**機能** (P0-1 実装):
- **表示条件**: `dayKey` 指定の日報で、`submitted=true` または `report.status='confirmed'` の場合のみ表示
- **部下向け表示**: 未提出時は「上長コメント欄を有効にするには日報を提出してください」プレースホルダ表示
- **上長向け機能**: `isManager` && `submitted` 時に、コメント入力テキストエリア + 送信ボタン表示
- **既存コメント一覧**: ManagerCommentCard で描画

---

### ManagerCommentCard (`src/components/today/ManagerCommentCard.tsx`)

**役割**: 個別コメント表示 + 返答ボタン。

**行数**: 63行

**機能** (P2 YES/NO 返答 UI 改善):
- **コメント本体**: 作成者（上長名） + 日時（MM-DD HH:MM） + 本文
- **返答ボタン** (部下向け、未返答時のみ表示):
  - ✅ YES（了承）: `green-500 hover:green-600` ボタン
  - ❌ NO（要相談）: `orange-500 hover:orange-600` ボタン
- **返答後の表示** (P2 実装):
  - 自約の返答: 「📌 あなたの返答: ✅ YES / ❌ NO (HH:mm)」を blue-50 背景で表示、ボタンは非表示
  - 他ユーザーの返答: 「●●さん: ✅ YES (HH:mm)」形式で之並で表示
- **削除** (上長のみ): 🗑 アイコン、Trash2 icon

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

**役割**: 下部ステータスバー。自動保存表示、ステータスステッパー、ステータス別アクションボタン。

**行数**: 100行

**Props**:
```typescript
interface StatusBarProps {
  report: DailyReport;
  onConfirmPlanning: () => void;  // planning → in_progress
  onShowSubmit: () => void;       // in_progress → submitted
  onWithdraw: () => void;         // submitted → in_progress（取り下げ・差し戻し共通）
}
```

**ステータス別ボタン表示**:

| ステータス | 表示ボタン |
|---|---|
| `planning` | 「▶ 予定を確定する」（indigo） |
| `in_progress` | 「✅ 提出する」（blue） |
| `submitted` | 「← 取り下げ」（amber、未承認時のみ） |
| `confirmed` | 「🔒 承認済み・変更不可」バッジ（green） |

**ステップインジケーター**: 予定入力 → 実績入力 → 提出済み → 承認済み の4ステップを点で可視化。

---

### SettingsPage (`src/pages/SettingsPage.tsx`)

**役割**: ユーザー設定画面。プロフィール、パスワード、クイックチップなど。

**メールアドレス変更申請** (M-1 UX修正):
- **表示**: メールアドレス欄を readonly 化
- **申請ボタン**: 「変更申請」ボタン追加
- **モーダル**: 申請用モーダル表示（新メールアドレス入力）
- **状態表示**: 申請待機中は「📋 申請待機中: <addr>」と表示

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
| 優先度 HIGH | 🔥 赤 (bg-red-100 border-red-200 text-red-700) |
| 優先度 MEDIUM | ⭐ 黄 (bg-amber-100 border-amber-200 text-amber-700) |
| 優先度 LOW | 💧 青 (bg-blue-100 border-blue-200 text-blue-700) |

---

## アクセシビリティ

- ChipPopover: `role="dialog"` + `aria-label`
- キーボード操作: 1〜7キーで種別選択、Enterで確定、Escでキャンセル
- ユーザー入力はすべて React JSX 経由（`dangerouslySetInnerHTML` 不使用）

---

## 改修履歴

- **2026-06-03**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
