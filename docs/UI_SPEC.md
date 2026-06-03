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

## ページ詳細

### DashboardPage (`src/pages/DashboardPage.tsx`)

**役割**: 上長向けダッシュボード。未確認数、ヒートマップ、チーム進捗を表示。

**行数**: 110行（EMP-2/MGR-2 反映後）

**主要セクション**:

#### 未確認カード (MGR-2)
- **リンク先**: `/search?status=submitted&auto=1` に変更
  - SearchPage 側で `useSearchParams` を読み、`status=submitted` で初期 selectedStatuses を上書き
  - `auto=1` フラグで自動検索を実行（searched=true を初期値に）

#### ヒートマップ (EMP-2)
- **セル UI 改善**: `<span>` → `<button>` 化
  - 型: `type="button"`
  - スタイル: `hover:bg-blue-50 rounded-full w-7 h-7 inline-flex items-center justify-center transition-colors`
  - `title` 属性: `${formatDate(dateStr)} の日報を開く`
  - `aria-label`: `${user.name} ${dateStr} の日報`
- **遷移先**: `/reports/${dateStr}?user=${userId}` に変更（user param 追加）
- **内容**: 気分絵文字 or 📄 プレースホルダ

---

## コンポーネント詳細

### TodayPage (`src/pages/TodayPage.tsx`)

**役割**: オーケストレーター。State管理、hooks、ハンドラー関数を保持。

**行数**: 291行（EMP-1/MGR-1 反映後）

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
- `useNavigate` (ページ遷移)

**ナビゲーション** (EMP-1, MGR-1):
- **MGR-1**: useEffect で `currentRole === 'manager' || 'executive'` ならば `/dashboard` へ自動 redirect（replace=true）
- **EMP-1**: ヘッダー日付の左右に前日・翌日ナビボタン追加
  - 左ボタン: クリックで `/reports/<前日 YYYY-MM-DD>` へ navigate（subDays from date-fns）
  - 右ボタン: クリックで `/reports/<翌日 YYYY-MM-DD>` へ navigate（addDays from date-fns）
  - UI: ArrowLeft/ArrowRight icon, px-1.5 py-1, text-gray-500 hover:text-gray-800 rounded

---

### ReportDetailPage (`src/pages/ReportDetailPage.tsx`)

**役割**: 特定日付の日報を詳細試譣、上長を認可対象。

**行数**: 198行（NAV-1 反映後）

**ナビゲーション** (NAV-1):
- **位置**: ヘッダー下、未確認カード上に上部位置したナビゲーションエリア（bg-blue-50 border border-blue-100 rounded-lg）
- **一般ユーザービュー** (自分のみ)
  - 「← 前の日報」ボタン (ArrowLeft + 日付)
  - 「次の日報 →」ボタン (ArrowRight + 日付)
  - 前/次がなければ disabled, opacity-40
  - クリックで `/reports/${target.date}` へ navigate
- **上長ビュー** (currentRole === 'manager' || 'executive')
  - 上記に加えて「⚠ 未確認」セクションを右側に追加（status='submitted' のみ）
  - 「← 前の未確認」ボタン (ArrowLeft, bg-orange-100 text-orange-700)
  - 「次の未確認 →」ボタン (ArrowRight, bg-orange-100 text-orange-700)
  - 前/次未確認がなければ disabled
  - **皶环**: 未確認一覧を皶环状に充子（一照は起点）
  - クリックで `/reports/${target.date}?user=${target.userId}` へ navigate
- **スコープ制御**:
  - sortedAccessibleReports: currentRole と憤限範囲からフィルタ
    - general: 自分のみ
    - manager: 自賊主任 + 同一チーム上長の部下
    - executive: 全会社
  - unconfirmedReports: isManagerView 時のみ status='submitted' を抽出、皶环可能

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

### SearchPage (`src/pages/SearchPage.tsx`)

**役割**: 日報検索インターフェース。フィルタ × 検索結果誊例。

**行数**: 190行（MGR-2/LIST-1 反映後）

**クエリパラメタ機能** (MGR-2):
- `useSearchParams()` で日偈の URL クエリを読み込み
  - `status` を解析し、`parseStatusFilter()` で selectedStatuses 别一値を override
  - `auto=1` を検索し、初期 searched=true を設定し複数検索自動実行
- `parseStatusFilter(raw)` 関数:
  - ヌル or 空文字列 → ALL_STATUSES (中緘)
  - カンマ区切り文字列 → 構成要素を取り出し、有効 ReportStatus のみ抽出

**検索結果カード** (LIST-1):
- **氏名表示位置**: 結果カード先頻に移動 (mb-1.5)
- **表示条件**: currentRole !== 'general' の穵に、author.name を誆8帳
- **スタイル**: `text-base font-bold text-gray-900`（大きく粗い）
- **日付セクション**: 氏名下へ (font-medium ダウン）
- 日付下位置の StatusBadge は変わらず

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

- **2026-06-03 c059b47**: 鳳凰殿 UX ジャーニー改善 6件を反映
  - **NAV-1**: ReportDetailPage に日報前後ナビゲーション追加 (上長ビュー時は未確認循環値も)
  - **MGR-1**: TodayPage で上長ロール自動 redirect を `/dashboard` へ
  - **MGR-2**: Dashboard 未確認カードリンク先を `/search?status=submitted&auto=1` に変更、SearchPage で初期検索自動実行
  - **EMP-1**: TodayPage ヘッダー日付左右に前・翌日ナビボタン追加
  - **EMP-2**: Dashboard ヒートマップセル button 化、hover 状態改善、user param 付与
  - **LIST-1**: SearchPage 検索結果で author.name を先頭強調表示（上長以上のみ）
- **2026-06-03 以前**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
