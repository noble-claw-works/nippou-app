## 既存ページ詳細

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
**コメント機能（上長↔部下双方向スレッド）** (MGR-4、40e081e 2026-06-06 で双方向化):
- **権限**: 上長 (currentRole !== 'general') のみがコメント投稿可
- **担当者投稿**: 一般社員 (general) は自身の報告書に上長宛コメントを能動的に投稿可 (canCommentAsAuthor = currentRole === 'general' && report.userId === currentUserId)
- **表示条件**: canPostComment = canComment || canCommentAsAuthor が真であれば、コメント入力欄を表示
- **削除権**: 担当者は自投稿のみ削除可 (削除ボタンは comment.authorUserId === currentUserId の時のみ表示)
- **Placeholder 区別**: 
  - canCommentAsAuthor が真: 「上長への返信・補足を入力...」
  - それ以外: 「コメントを追加...」
- **表示順**: アバター ➜ 氏名 (+ 「↑ 上長宛」バッジ) ➜ 日時 ➜ コメント本文
- **投稿時**: `addManagerComment(dayKey, userId, body, authorRole)` に `currentRole` を渡す

**コメント投稿者の視覚区別**:

| ロール | 自分日報 | 他人日報 | アバター色 | バッジ |
|---|---|---|---|---|
| executive | ✅ | ✅ | 青系 (`bg-blue-100 text-blue-700`) | なし |
| manager | ✅ | ✅ | 青系 (`bg-blue-100 text-blue-700`) | なし |
| general | ✅ (上長宛) | ❌ | 緑系 (`bg-green-100 text-green-700`) | 「↑ 上長宛」 |

**「↑ 上長宛」バッジ** (部下コメント時のみ):
- `authorRole === 'general'` または (authorRole 未設定 & コメント作成者の role が 'general') の場合に表示
- スタイル: `text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-medium`
- 位置: 氏名の右隣

**部下から上長へのメッセージ送信方法**:
1. 部下 (general ロール) が自身の日報詳細ページ (`/reports/:date?user=自分のID`) を開く
2. 右ペイン下部「💬 コメント」セクションにあるテキスト入力欄に入力
   - プレースホルダー: 「上長への返信・補足を入力...」
3. Enter キーまたは送信ボタン (Send アイコン) で投稿
4. 投稿されたコメントは緑系アバター + 「↑ 上長宛」バッジで表示される
5. 上長が同ページを開くと、コメントが確認できる

---

---

### DashboardPage (`src/pages/DashboardPage.tsx`)

**役割**: 上長向けダッシュボード。未確認数、ヒートマップ、メンバー進捗、サマリーレポートを表示。

**主要セクション** (MGR-3/MGR-4/MGR-5/MGR-6):

#### MGR-3: メンバー別提出率・確認状況集計テーブル

**コンポーネント**: `src/components/dashboard/SubmissionStatsTable.tsx`

**目的**: 当月営業日基準で、メンバー別の提出件数 / 提出率 / 確認件数 / 確認率を一覧表示。

**レイアウト**: テーブル (thead + tbody)

**ヘッダー行**:
- メンバー | 提出 / 営業日 | 提出率 | 確認 / 提出 | 確認率 | アクション

**各行** (メンバー単位):
- **メンバー名**: ユーザーアバター + 名前
- **提出件数**: N / M 形式 (例: 18/20)
- **提出率**:
  - 数値: XX.X% で表示
  - 色分けバッジ: ≥90% → bg-green-100 text-green-700 / ≥70% → bg-blue-100 text-blue-700 / ≥50% → bg-amber-100 text-amber-700 / <50% → bg-red-100 text-red-700
- **確認件数**: X / Y 形式
- **確認率**: 同様に色分けバッジ
- **アクション**: 「詳細 →」リンク (text-blue-600) で `/search?user={userId}&status=submitted,confirmed` へナビゲート

**フッター行** (チーム平均):
- "チーム平均" セル
- チーム全体の提出率 / 確認率を計算し、同じバッジで表示

**営業日計算**:
- 当月 1 日 ~ 末日の日数（土日祝を除く）を M とする
- 各メンバーの月内提出済日報件数（status='submitted' or 'confirmed'）を N とする

#### MGR-4: 未確認日報の一括確認

**コンポーネント**: `src/components/dashboard/BulkConfirmPanel.tsx`

**目的**: 提出済日報（status='submitted'）を複数選択し、一括で confirmed 状態に変更。

**表示条件**: status='submitted' のレポートが存在する場合のみ表示

**レイアウト**:
- ヘッダー: 「✅ 未確認日報の一括確認」+ 件数
- リスト（status='submitted' を date 昇順でソート）

**各行**:
- チェックボックス（左）
- 日付 (YYYY-MM-DD) + 担当者名
- StatusBadge (submitted)
- 削除時刻（submittedAt を formatDistanceToNow で表示、例: "3時間前"）

**フッター操作**:
- 「☑ すべて選択」チェックボックス (全 submitted を一括選択)
- 「N 件を一括確認」ボタン (bg-blue-600 text-white)
- ConfirmDialog で確認: 「N 件の日報を確認済みにしますか？」
- 実行: `bulkConfirmReports(reportIds[]): number` を呼び出し
- 成功通知: `addToast({ type: 'success', message: 'N 件の日報を一括確認しました' })`

**空状態**: 「未確認の日報はありません 🎉」

#### MGR-5: 部下別 TODO 進捗・件数表示

**コンポーネント**: `src/components/dashboard/TodoProgressPanel.tsx`

**目的**: チーム内メンバーごとの TODO ステータス分布と期限情報を可視化。

**各メンバーセクション**:
- **名前**: ユーザーアバター + 名前
- **進捗バー**: 3段の積み上げバー
  - 幅 100% → ✅完了 / 🔄進行中 / 📌未着手 の割合を色分け
  - 色: 完了=green-500 / 進行中=blue-500 / 未着手=gray-300
  - 高さ: h-2
- **メトリクス**: "完了: 12 / 進行中: 3 / 未着手: 2"
- **進捗率**: "70% 完了"
  - 計算: 完了件数 / (完了 + 進行中 + 未着手) × 100
  - 色分け: ≥80% → text-green-600 / ≥50% → text-blue-600 / ≥25% → text-amber-600 / <25% → text-red-600

**特殊セクション**:
- **⏰ 今日が期限**: bg-amber-50 border-l-4 border-l-amber-400
  - 当日期限の未完了 TODO を 1 行に 1 件表示
  - "[メンバー名] - TODO内容"形式
  - 完了: done / 進行中: doing のみ表示（todo 状態は未対象）

- **🚨 期限切れ**: bg-red-50 border-l-4 border-l-red-400
  - 期限を過ぎた未完了 TODO
  - 赤バッジ「⚠ 期限切れ」を各行に表示
  - "[メンバー名] - TODO内容 (期限: YYYY-MM-DD)"形式
  - クリックで `/reports/{reportDate}?user={userId}` へナビゲート

**期限判定**:
```typescript
const isOverdue = (todo: Todo): boolean => {
  if (todo.completed || todo.status === 'done') return false;
  if (!todo.dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(todo.dueDate) < today;
};

const isDueToday = (todo: Todo): boolean => {
  if (todo.completed || todo.status === 'done') return false;
  if (!todo.dueDate) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(todo.dueDate).getTime() === today.getTime();
};
```

#### MGR-6: 週次・月次サマリーレポート

**コンポーネント**: `src/components/dashboard/SummaryReportPanel.tsx`

**目的**: チーム全体のメトリクスを週単位または月単位で集計し、ダッシュボード上に簡潔に表示。

**期間切替**:
- ボタンセット: 【週】【月】(bg-gray-100 rounded-lg p-1)
- 状態管理: `period: 'week' | 'month'`

**ナビゲーション**:
- 左右矢印ボタン (ChevronLeft / ChevronRight icon)
  - 週: `subWeeks(date, 1)` / `addWeeks(date, 1)`
  - 月: `subMonths(date, 1)` / `addMonths(date, 1)`
- 「今週」/ 「今月」ボタン (bg-blue-50 text-blue-700)
- ラベル表示: "M/d – M/d" (週) or "yyyy年M月" (月)

**4 メトリクスカード** (各 1 カードで横並び):

1. **提出率**
   - テキスト: "XX.X%"
   - 計算: 営業日数ベースで当期提出済日報数 / 営業日数
   - 色: ≥90% → bg-green-50 text-green-700 / ≥70% → bg-blue-50 text-blue-700 / ≥50% → bg-amber-50 text-amber-700 / <50% → bg-red-50 text-red-700

2. **確認率**
   - テキスト: "XX.X%"
   - 計算: 確認済 / 提出済
   - 色: 提出率と同じ

3. **活動メンバー**
   - テキスト: "N 人 / M 人"
   - 計算: 当期に最低 1 件以上提出済のメンバー数 / 全アクティブメンバー数

4. **TODO 完了率**
   - テキスト: "XX.X%"
   - 計算: 当期内の全 TODO のうち status='done' の割合
   - 色: メトリクスカード 1-2 と同じ

**アクティビティ分布グラフ**:
- **ブロック種別 % グラフ**: 棒グラフまたはドーナツグラフ
- 凡例: visit / office / phone / travel / break / meeting / lunch
- データソース: 当期の全 timeblock から type 別にカウント
- テキスト表示: "visit 40% · office 25% · phone 20% · ..."形式

**ランキングセクション** (2つの TOP 5 ラベル):

1. **訪問顧客数 TOP 5**
   - 当期内の visit ブロックから customerId を抽出し、顧客ごとにカウント
   - top 5 を降順で表示: "1. 顧客名 (8件) · 2. 顧客名 (6件) · ..."

2. **提出件数 TOP 5**
   - 当期内のメンバー別提出件数
   - top 5 を降順で表示: "1. メンバー名 (20件) · 2. メンバー名 (18件) · ..."

---

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

**ナビゲーション** (EMP-1, MGR-1, MGR-5):
- **MGR-1**: useEffect で `currentRole === 'manager' || 'executive'` ならば `/dashboard` へ自動 redirect（replace=true）
  - **MGR-5 バイパス**: `searchParams.get('self') === '1'` の時を割り夫て許可 (上長自身の日報作成不可を応助)
- **EMP-1**: ヘッダー日付の左右に前日・翌日ナビボタン追加
  - 左ボタン: クリックで `/reports/<前日 YYYY-MM-DD>` へ navigate（subDays from date-fns）
  - 右ボタン: クリックで `/reports/<翌日 YYYY-MM-DD>` へ navigate（addDays from date-fns）
  - UI: ArrowLeft/ArrowRight icon, px-1.5 py-1, text-gray-500 hover:text-gray-800 rounded

---

### ReportDetailPage (`src/pages/ReportDetailPage.tsx`)

**役割**: 特定日付の日報を詳細表示、上長を認可対象。

**行数**: 285行（NAV-1 + RPT-1 + RPT-2 反映後）

**ナビゲーション** (NAV-1):
- **位置**: ヘッダー下、メインコンテンツ上に上部位置したナビゲーションエリア（bg-blue-50 border border-blue-100 rounded-lg）
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
  - **循環**: 未確認一覧を循環状に充当（一番最後は起点）
  - クリックで `/reports/${target.date}?user=${target.userId}` へ navigate
- **スコープ制御**:
  - sortedAccessibleReports: currentRole と権限範囲からフィルタ
    - general: 自分のみ
    - manager: 自部下 + 同一チーム上長の部下
    - executive: 全会社
  - unconfirmedReports: isManagerView 時のみ status='submitted' を抽出、循環可能

**レイアウト** (RPT-1 + RPT-2、BUG-A 真の修正 94ed85b):
- **グリッド構成**: `grid grid-cols-1 lg:grid-cols-3 gap-4`
  - **左側** (lg:col-span-2): `ReadOnlyTimeline` のみ（外側ラッパーなし—ヘッダーはコンポーネント内部で保持）
  - **右側** (lg:col-span-1): TODO + 振り返り + 上長コメント（右ペイン、縦積み）
- **モバイル時**: 従来通り下に積まれる
- **デザイン統一**: Today ページと同じ 2 列レイアウト（左=タイムライン / 右=サイドパネル）
- **BUG-A (中間対応 b4ec6c8 廣待指摘以前)**: ReadOnlyTimeline 内部で md ブレークポイント（768px）で 2 列化していたが、主上御指摘により sm ブレークポイント（640px）+ Today と同一コンポーネント 構成に統一（真の修正）

**タイムラインセクション** (RPT-2 縦軸ピクセルタイムライン + BUG-A 真の修正 94ed85b):
- **コンポーネント**: `ReadOnlyTimeline` (`src/components/report/ReadOnlyTimeline.tsx`)
- **目的**: TodayPage の TimelinePanel と同じ「◀ 予定 | 実績 ▶」2 カラム並列レイアウトで読み取り専用表示
- **ヘッダー**: コンポーネント内部に「📅 タイムライン」見出し + 「🎨 凡例」トグルボタンを持つ（ReportDetailPage 外側の `<h2>` + `bg-white rounded-xl p-4` ラッパーは撤去済み）
- **時刻軸**: DAY_START=6*60, DAY_END=22*60+30, HOUR_PX=64
  - `<TimeGrid>`: 1時間ごと水平線 + 左端の時刻ラベル
- **variant='all'（デフォルト）— 2 カラム並列レイアウト**:
  - **sm 以上 (≥640px)**: `hidden sm:flex` で横並び 2 列
    - 時刻ラベル列: `width: 40px`（bg-gray-50/50）
    - 予定列: `flex-1` + `data-testid="timeline-planned-col"`（indigo テーマ, bg-indigo-50/20）
    - 1px セパレータ: `w-px bg-gray-200`
    - 実績列: `flex-1` + `data-testid="timeline-actual-col"`（emerald テーマ, bg-emerald-50/20）
  - **sm 未満 (モバイル)**: `sm:hidden` で予定→実績の縦積み
    - 予定ブロック: ヘッダー「📋 予定」(indigo-50) + `ReadOnlyTimelineColumn`
    - 実績ブロック: ヘッダー「✅ 実績」(emerald-50) + `ReadOnlyTimelineColumn`
  - **説明バー (sm 以上)**: 「◀ 予定（計画したこと）」「実績（実際にやったこと）▶」
  - **Today との対称性**: TodayPage TimelinePanel と完全に同じカラム構成・カラーリングを採用
- **variant='planned'|'actual'（後方互換）**: 単一カラム `SingleColumnTimeline` で表示
- **ブロック表示** (`<BlockBar>`):
  - **カラーリング**: BLOCK_COLORS で型別色分け
  - **メモ表示**: 高さ≥50px のとき 2行 line-clamp でメモを表示
- **スキマ時間表示** (`<GapBar>`):
  - **色**: amber 破線縦バー（border-dashed border-amber-300 bg-amber-50/40）
  - **フォーマット**: formatGapDuration で「N時間M分」表示
- **Props**: `{ blocks, customers, variant?: 'all'|'planned'|'actual' }`
- **e2e テスト**: `data-testid="timeline-planned-col"` / `"timeline-actual-col"` で横並び確認可能
- **空状態**: ブロックなしは「記録なし」（text-xs text-gray-400）

**右ペイン** (BUG-A対応後):

**TODO セクション**:
- **見出し**: ✅ TODO
- **位置**: 右ペイン内（上）
- **内容**: チェックボックス + テキスト + 追加ボタン + DEAD-1 期限切れ赤バッジ

**振り返りセクション**:
- **見出し**: 💭 振り返り
- **位置**: 右ペイン内（中）
- **内容**: mood selector + reflection textarea

**コメント (双方向)** (RPT-1、BUG-A後は通常カード、40e081e で双方向化):
- **位置**: 右ペイン内（下）
- **スタイル**: 通常カード（`<div className="...rounded-xl border...">`）
- **見出し**: 💬 コメント ({dayComments.length})
- **空状態**: 「コメントがありません」
- **コメント列**: アバター (ロール別カラー) + 氏名 + バッジ (部下投稿時) + タイムスタンプ + コメント本文
  - 上長/役員投稿: 青系アバター (`bg-blue-100 text-blue-700`)
  - 部下投稿: 緑系アバター (`bg-green-100 text-green-700`) + 「↑ 上長宛」バッジ
- **追加フォーム**: 権限者 (上長) または canCommentAsAuthor (部下本人) のみ表示、テキスト入力 + 送信ボタン (Send アイコン)
- **備考**: 旧 sticky aside (`lg:sticky lg:top-4 lg:self-start`) → 新 通常カード（右ペイン内に統合）
- **セクション名変更**: 「上長コメント」→「コメント」(40e081e)

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

**役割**: 日報検索インターフェース。フィルタ × 検索結果表示。

**行数**: 210行（MGR-2/MGR-3/LIST-1 反映後）

**クエリパラメタ機能** (MGR-2):
- `useSearchParams()` で日中の URL クエリを読み込み
  - `status` を解析し、`parseStatusFilter()` で selectedStatuses 初期値を override
  - `auto=1` を検索し、初期 searched=true を設定し複数検索自動実行
- `parseStatusFilter(raw)` 関数:
  - ヌル or 空文字列 → ALL_STATUSES (中立)
  - カンマ区切り文字列 → 構成要素を取り出し、有効 ReportStatus のみ抽出

**検索結果カード** (LIST-1):
- **氏名表示位置**: 結果カード先頭に移動 (mb-1.5)
- **表示条件**: currentRole !== 'general' の時に、author.name を強調
- **スタイル**: `text-base font-bold text-gray-900`（大きく粗い）
- **日付セクション**: 氏名下へ (font-medium ダウン）
- 日付下位置の StatusBadge は変わらず

**ミニタイムライン** (MGR-3):
- **目的**: 1日の時間配分を帯を 100% に正規化し、帯形式で描画
- **位置**: 検索結果カード内、氏名 → StatusBadge 下 (mt-2)
- **正規化範囲**: 08:00 〜 20:00 を 100% に画一 (dayStartMin=480, dayEndMin=1200 が日時)
- **帯セグメント**: `calcMiniTimelineSegments()` から算出した (leftPct, widthPct) を提用
  - 素材: `<div class="absolute bg-{color} border-r border-white/60" style="left: {leftPct}%, width: {widthPct}%">` を直含
  - 絵を emoji（`text-[10px]`）で表示
  - title 属性: `${startTime}–${endTime} ${title || BLOCK_LABELS[type]}`
- **コンテナ**: `h-7 bg-gray-50 rounded-md overflow-hidden` (aria-label 付賦)
- **目盛り**: 下部に目盛り (「8:00 / 12:00 / 16:00 / 20:00」を text-[10px] text-gray-400 tabular-nums で表示)
- **空状態**: ブロックなし は 「ブロック未記録」 テキスト (text-xs text-gray-400 mt-2)

**索引機能**:
- `calcMiniTimelineSegments<T>(blocks, dayStartMin?, dayEndMin?)` 関数: `MiniTimelineSegment[]` を輸出
  - 入力と出力の 1:1 対応を保証 (並び順を維持)

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
```

---

### 顧客選択 UI — CustomerCombobox (BlockModal / ComplimentsCard / TodayPage 共通)

**背景**: 11e82a7 にてブロックモーダル・お褒め記録・TodayPage の顧客選択を `<select>` から `<CustomerCombobox>` へ移行。1000 件規模の顧客マスタに対応したインクリメンタル検索を提供する。

#### 表示順序

検索クエリが空の場合、以下の優先度で顧客を並べる:

| 優先度 | 条件 |
|---|---|
| 1 位 | お気に入り (`isFavorite: true`) |
| 2 位 | 最近接触 30 日以内 (`lastContactDate >= 30日前`) |
| 3 位 | アクティブ (`status: 'active'`) |
| 4 位 | その他 |

検索クエリがある場合はスコアリング順（詳細は `docs/UTILITIES.md` 参照）。

#### 各行の表示フォーマット

**1 行目**: `⭐ 顧客名 (エリア)` 
- お気に入り顧客には先頭に ⭐ を表示
- 最近接触（30 日以内）には 🕒 アイコンを追加
- エリア情報がある場合: `顧客名 (エリア)` 形式

**2 行目（サブテキスト）**: `タグ ・ 最終接触: YYYY/MM/DD`
- タグが存在する場合は `tag1 / tag2` 形式で表示
- タグと最終接触日が両方ある場合は「・」で区切る
- どちらも存在しない場合、2行目は非表示

#### 50 件超過時フッタ

検索結果が 50 件を超える場合、ドロップダウン下部に以下を表示:

```
他 N 件は検索を絞ってください
```

#### キーボード操作

| キー | 動作 |
|---|---|
| `↓` | 次の候補に移動 (ドロップダウン未展開時は展開) |
| `↑` | 前の候補に移動 |
| `Enter` | フォーカス中の候補を選択 |
| `Escape` | ドロップダウンを閉じる |
| `Tab` | ドロップダウンを閉じてフォーカス移動 |

#### ARIA 仕様

| 属性 | 値 |
|---|---|
| `role` | `combobox` (input 要素に付与) |
| `aria-expanded` | ドロップダウン開閉状態 (`true` / `false`) |
| `aria-controls` | listbox 要素の `id`（`useId()` で生成）|
| `aria-activedescendant` | フォーカス中の listbox item の `id` |
| `aria-autocomplete` | `"list"` |
| `aria-required` | `required` prop の値を反映 |
| リスト側 | `role="listbox"`, 各 item は `role="option"` + `aria-selected` |

---

### SettingsPage (`src/pages/SettingsPage.tsx`)

**役割**: ユーザー設定画面。プロフィール、パスワード、クイックチップなど。

**メールアドレス変更申請** (M-1 UX修正):
- **表示**: メールアドレス欄を readonly 化
- **申請ボタン**: 「変更申請」ボタン追加
- **モーダル**: 申請用モーダル表示（新メールアドレス入力）
- **状態表示**: 申請待機中は「📋 申請待機中: <addr>」と表示

---

### NotFoundPage (`src/pages/NotFoundPage.tsx`)

**役割**: 未定義 URL へのアクセス時に表示する 404 エラーページ。

**E-7 NotFoundPage (catch-all ルート)**:
- **トリガー**: App.tsx の catch-all ルート (`path="*"`) により、定義されていないパスへのアクセス時に描画される
- **ルート定義**: `<Route path="*" element={<NotFoundPage />} />` — AppLayout 内 `<Routes>` の末尾に配置
- **認証ガード**: `RequireAuth` でラップされているため、未認証ユーザーは `/login` へリダイレクトされ、この画面には到達しない

**UI**:
- **アイコン**: `FileQuestion` (lucide-react, `w-16 h-16 text-gray-300`)
- **見出し**: 「404 - ページが見つかりません」 (`text-2xl font-bold text-gray-800`)
- **説明文**: 「お探しのページは存在しないか、移動・削除された可能性があります。」 (`text-sm text-gray-500`)
- **戻るリンク**: `<Link to="/">` → 「トップへ戻る」ボタン (`bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5`)
- **レイアウト**: 中央寄せカード (`min-h-[60vh] flex flex-col items-center justify-center`, `bg-gray-50 rounded-2xl border border-gray-200 p-10 max-w-md shadow-sm`)

---

### 顧客削除後の過去日報表示ルール (E-8)

**背景**: `deleteCustomer(customerId)` 実行後、過去の日報ブロックに残る `customerId` は参照先が存在しなくなる。この状態で顧客名を表示しようとした際の統一表示ルール。

> **真の原因 (0450936 で対応)**: `139386b` は UI 層の `'不明'` フォールバックを実装したが、Zustand store をリロードすると削除した顧客が seed data から復元される根本問題が未解決だった。`e54993b`/`0450936` で `src/store/deletedCustomers.ts` の永続化機構を実装し、リロード後も削除状態を維持するようになった。

**UI 層ルール**: 削除済み顧客を参照するブロックの顧客名表示箇所では、名前の代わりに `'不明'` と表示する。

**適用箇所と実装**:

| コンポーネント | 箇所 | 実装 |
|---|---|---|
| `ReadOnlyTimeline` (`src/components/report/ReadOnlyTimeline.tsx`) | BlockBar に渡す `customerName` | `customers.find(c => c.id === block.customerId)?.name ?? '不明'` |
| `SidePanelCards` (`src/components/today/SidePanelCards.tsx`) | CustomerSummaryCard 内の2箇所 | `customer?.name ?? '不明'` (旧: `customer?.name ?? block.customerId`) |
| `SearchPage` (`src/pages/SearchPage.tsx`) | 検索結果カードの訪問顧客名リスト | `customers.find(c => c.id === b.customerId)?.name ?? '不明'` |

**層別路線**:
1. **UI 層 (`139386b`)**: `customers.find(...)?.name ?? '不明'` フォールバック→ SPA ナビでは正常表示
2. **Store 永続化層 (`e54993b` + `0450936`)**: `src/store/deletedCustomers.ts` が `deleteCustomer` 時に `persistDeletedCustomerId(customerId)` で ID を localStorage に保存。store 初期化時に `_deletedCustomerIds` を読み込み、seed data からフィルタアウト→ リロード後も削除状態を維持

---


*NotificationsPage*:
- **handleClick 関数**: relatedReportId から report を検索し、有効なら `/reports/{date}?user={userId}` へ遷移
- **type 分岐**: reminder 型は `/today` へ、その他は `/calendar` へフォールバック
- **関数シグネチャ**: `const handleClick = (n: typeof userNotifs[number]) => { markNotificationRead(n.id); ... }`

*SettingsPage 通知設定*:
- **Controlled 化**: `notifPrefs: boolean[]` state を導入、デフォルト `[true, true, true, false]`
- **Checkbox**: `checked={notifPrefs[i]}` + `onChange` で state 更新
- **ラベル**: 4項目（「確認済みになったらメール通知」など）

*SettingsPage 表示設定*:
- **Controlled 化**: `displayPrefs: boolean[]` state を導入、デフォルト `[true, true]`
- **Checkbox**: `checked={displayPrefs[i]}` + `onChange` で state 更新
- **ラベル**: 2項目（「起動時に Today 画面を開く」「『日報のはじめ方』モーダルを次回も表示」）

*SettingsPage スナップ単位 Select*:
- **Controlled 化**: `snapUnit: '15' | '30' | '60'` state を導入、デフォルト `'30'`
- **Option**: value に `'15'/'30'/'60'` を明示、テキスト表示は「15分」「30分」「1時間」
- **onChange**: `e => setSnapUnit(e.target.value as '15' | '30' | '60')`


