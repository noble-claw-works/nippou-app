# UIコンポーネント仕様

## 概要

nippou-app の Today ページは以下のコンポーネントに分割されています。

---

## ページ構成

### LoginPage (`src/pages/LoginPage.tsx`)

**役割**: 認証。未認証ユーザーのログイン画面。

**AUTH-3 LoginPage UI**:
- 🎮 デモでお試しボタン: `loginAsUser('u1')` で一般社員ログイン
- 「役割で選んでログイン」展開: active ユーザー一覧から選んで loginAsUser。アバターイニシャルス + 名前 + メールアドレス + 役割表示
- メール+パスワードフォーム: `login(email, password)` 呼び出し、失敗は失敗カウンタ切り上げ、5回以上でアカウントロック
- 既にログイン済みなら useEffect で /today へリダイレクト
- トースト作成: `addToast({ type: 'success', message: '〜さんとしてログインしました' })`

**UI**:
- 一番上: デモバナー (データ不保存警告)
- 中央: 三段ボタン + 展開ユーザー一覧 + メールフォーム
- 下部: デモパスワード説明

### App.tsx (認証ガード)

**AUTH-1/AUTH-2**:

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = useAppStore(s => s.authSession !== null);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

function SessionWatcher() {
  useEffect(() => {
    // 操作イベントで expiresAt を伸ばす
    const onActivity = () => {
      if (useAppStore.getState().authSession) touchSession();
    };
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(e =>
      document.addEventListener(e, onActivity, { passive: true })
    );
    
    // 30秒おきに失効チェック
    const interval = setInterval(() => {
      const s = useAppStore.getState().authSession;
      if (s && new Date(s.expiresAt).getTime() < Date.now()) {
        logout();
        addToast({ type: 'warning', message: 'セッションが切れました。再度ログインしてください' });
      }
    }, 30_000);
    // cleanup...
  }, [touchSession, logout, addToast]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<RequireAuth><AppLayout /></RequireAuth>} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
```

---

### AppShell (ログアウト)

**AUTH-4 AppShell ログアウト**:
- ロールメニュー内にログイン中ユーザー情報（name + email）表示
- ログアウトボタン: `logout()` + `/login` へ navigate
- デモリセットも `/login` にリダイレクト

```tsx
const handleLogout = () => {
  logout();
  addToast({ type: 'info', message: 'ログアウトしました' });
  setMenuOpen(false);
  navigate('/login', { replace: true });
};
```

---

### SettingsPage (パスワード変更)

**AUTH-5 SettingsPage パスワード変更**:
- パスワードタブを mock toast から `changePassword(currentUserId, current, next)` 実装に置換
- 現在/新しい/確認の3フィールド、確認一致チェック、ストア結果のエラーメッセージ表示
- バリデーション: 4文字以上、現在と異なる

```tsx
const handleChangePassword = async () => {
  setPwError('');
  if (!pwCurrent || !pwNext || !pwConfirm) {
    setPwError('すべての項目を入力してください');
    return;
  }
  if (pwNext !== pwConfirm) {
    setPwError('新しいパスワードと確認が一致しません');
    return;
  }
  const result = changePassword(currentUserId, pwCurrent, pwNext);
  if (!result.ok) {
    setPwError(result.error);
    return;
  }
  setPwCurrent(''); setPwNext(''); setPwConfirm('');
  addToast({ type: 'success', message: 'パスワードを変更しました' });
};
```

---

### CalendarPage (視認性改善)

**CAL-1 カレンダー視認性**:

#### 状態別背景色塗り分け
```typescript
const STATUS_ICON: Record<ReportStatus, string> = {
  planning: '✎', in_progress: '✍', submitted: '✅', confirmed: '⭐',
};

const STATUS_BG: Record<ReportStatus, string> = {
  planning: 'bg-gray-50 border-gray-200',
  in_progress: 'bg-yellow-50 border-yellow-200',
  submitted: 'bg-blue-50 border-blue-300',
  confirmed: 'bg-green-50 border-green-300',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  planning: '予定入力中', in_progress: '実績入力中', submitted: '提出済', confirmed: '確認済',
};
```

#### セル要素を `<div>` → `<button>` 化
- クリック可能に
- `aria-label="{YYYY年M月d日}{ステータス名}"`
- `aria-current="date"` for 今日
- 「今日」はボーダー左 blue-600 4px で視覚差別化
- 「選択日」は ring-2 ring-blue-500 で表示

#### 月移動ボタン大型化
- border-2 + min-h-[44px]
- テキストラベル: 「前月」「翌月」
- ホバー: border-blue-500 へ

#### 「今日」ボタン追加
- bg-blue-50 text-blue-700 border border-blue-200 rounded-lg
- クリック: setCurrentMonth(new Date()), setSelectedDate(new Date())

#### 凡例をチップで再構成
```tsx
<div className="flex flex-wrap gap-2">
  <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded">✎ 下書き</span>
  <span className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">✍ 入力中</span>
  <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-300 rounded font-medium">✅ 提出済</span>
  <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-300 rounded font-medium">⭐ 確認済</span>
  <span className="flex items-center gap-1.5 px-2 py-1 border-l-4 border-blue-600 border-y border-r border-gray-200 rounded">今日</span>
  <span className="flex items-center gap-1.5 px-2 py-1 ring-2 ring-blue-500 ring-inset rounded">選択中</span>
</div>
```

---

### CustomersPage (件数表示・ソート)

**CUS-1 顧客一覧**:

#### 件数表示
- 「全 N 件（全顧客 M 件中）」+ 条件クリアボタン
- 検索またはフィルタ時に表示

#### ソート機能 5 種
```typescript
type SortKey = 'name_asc' | 'name_desc' | 'lastContact_desc' | 'nextAppt_asc' | 'created_desc';

const sorted = [...filtered].sort((a, b) => {
  switch (sortKey) {
    case 'name_asc':
      return a.name.localeCompare(b.name, 'ja');
    case 'name_desc':
      return b.name.localeCompare(a.name, 'ja');
    case 'lastContact_desc': {
      const av = a.lastContactDate ?? '';
      const bv = b.lastContactDate ?? '';
      if (av === bv) return a.name.localeCompare(b.name, 'ja');
      return bv.localeCompare(av); // 新しい順
    }
    case 'nextAppt_asc': {
      const av = a.nextAppointment ?? '9999-12-31';
      const bv = b.nextAppointment ?? '9999-12-31';
      if (av === bv) return a.name.localeCompare(b.name, 'ja');
      return av.localeCompare(bv); // 近い順
    }
    case 'created_desc':
      return (b.id ?? '').localeCompare(a.id ?? '');
    default:
      return 0;
  }
});
```

#### ソート選択 UI
- セレクトボックス: 【氏名昇↑】【氏名降↓】【最終接触新順】【次回AP近順】【登録新順】
- 状態: `[sortKey, setSortKey]`
- 結果に即座に反映

**CUS-2 顧客対応履歴一覧**:

#### 一覧行への履歴バッジ追加
- **「📅 履歴N件」バッジ**: インラインで表示、bg-indigo-50 text-indigo-700 rounded-full
- **表示条件**: historyCountByCustomer.get(customer.id) > 0 の場合のみ表示
- **計算方法**: reports を走査し、各 block.customerId に対してカウント（1行=1ブロック単位）

#### 「📅 履歴」ボタン追加
- **位置**: アクション列（編集ボタン同列）
- **表示条件**: historyCountByCustomer.get(customer.id) > 0 の場合のみ表示
- **スタイル**: px-2.5 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50
- **クリック動作**: `/customers/{id}#history` へ navigate
- **aria-label**: `${customer.name} の対応履歴を見る`

### CustomerDetailPage (`src/pages/CustomerDetailPage.tsx`)

**役割**: 顧客詳細表示、対応履歴を一覧表示。

**CUS-3 顧客対応履歴をタイムライン型カードレイアウトに刷新**:

#### レイアウト
- **セクション ID**: `id="history"` → URL ハッシュ `#history` で scrollIntoView
- **トリガー**: 1. URL ハッシュ `#history` で useEffect が `el.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- **構成**: `<section id="history">` + ヘッダー（「📅 対応履歴」+ 件数 + "新しい順" ラベル）+ 垂直タイムラインコンテナ

#### 空状態
- テキスト: 「対応履歴がありません」
- スタイル: text-sm text-gray-400 py-6 text-center

#### 履歴エントリ列
- **単位**: 1 行 = 1 TimeBlock（従来の report 単位ではない）
- **並び順**: reportDate 降順 → 同日 startTime 降順
- **ソース**: historyEntries = 全 reports を走査 → 該当 customerId を含む block を平める → ソート
- **レイアウト**: `<div className="relative pl-6">` + 垂直タイムライン軸（`absolute left-2 w-px bg-gradient-to-b`）+ `<ul className="space-y-3">`

#### タイムラインビジュアル
- **垂直軸**: `absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-transparent` （グラデーション）
- **各エントリのドット**: `absolute -left-[18px] top-3 w-3 h-3 rounded-full bg-white border-2 border-blue-400 shadow-sm`
- **パッドモード**: `relative pl-6` でエントリを右にシフト

#### カード型スタイル
- **ボーダー**: `border border-gray-200 border-l-4`
- **左ボーダー色**（種別別）:
  - `visit`: border-l-blue-400 bg-blue-50/30
  - `office`: border-l-gray-400 bg-gray-50/30
  - `phone`: border-l-amber-400 bg-amber-50/30
  - `travel`: border-l-emerald-400 bg-emerald-50/30
  - `break`: border-l-pink-300 bg-pink-50/30
  - `meeting`: border-l-purple-400 bg-purple-50/30
  - `lunch`: border-l-orange-400 bg-orange-50/30
  - デフォルト: border-l-gray-300 bg-gray-50/30
- **ホバー**: `hover:shadow-md hover:border-blue-300 transition-all`
- **パディング**: `p-3`
- **ボタンレイアウト**: `block w-full text-left rounded-lg`

#### ヘッダー行（日付・時刻・種別）
- **レイアウト**: `flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5`
- **日付**: `text-sm font-semibold text-gray-900 inline-flex items-center gap-1`（メイン要素）
- **時刻**: `text-xs text-gray-600 tabular-nums inline-flex items-center gap-1`（副要素）
- **種別バッジ**: `ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700`（右寄せ）

#### タイトル
- block.title が存在する場合のみ表示
- `text-sm font-medium text-gray-900 mb-1`

#### メモ
- block.memo が存在する場合のみ表示
- `text-sm text-gray-700 whitespace-pre-wrap break-words mb-2 leading-relaxed`

#### 訪問結果グリッド
- **表示条件**: result || proposal || collected || nextAppointment のいずれかが存在する場合
- **レイアウト**: `mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs`（2列グリッド、モバイルで1列）
- **結果・提案セル**: `flex items-start gap-1.5 bg-white rounded px-2 py-1.5 border border-gray-100`（子要素: アイコン + [ラベル+値を縦]）

#### フッター行（メタ情報・バッジ）
- **レイアウト**: `flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100`
- **担当者**: `inline-flex items-center gap-1 text-xs text-gray-600`（User icon + name）
- **「予定」バッジ**: `isActual=false` 時のみ → `inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px]`
- **「集金済」バッジ**: `collected=true` 時のみ → `inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[10px]` + CheckCircle2 icon
- **「次回AP」バッジ**: `nextAppointment` が存在時 → `inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]`（📆 emoji + 日付）
- **右端**: `ml-auto text-[10px] text-blue-600 hover:underline` (「日報を開く →」テキスト)

#### クリック動作
- **要素**: button（各カード全体）
- **`onClick`**: `/reports/{reportDate}` へ navigate
- **`aria-label`**: `${reportDate} ${startTime}〜${endTime} ${BLOCK_LABELS[type]} の日報を開く`
- **フォーカス**: focus:outline-none focus:ring-2 focus:ring-blue-500

---

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
**上長コメント機能** (MGR-4):
- **権限**: 上長 (currentRole !== 'general') のみがコメント投稿可
- **担当者返信**: 一般社員 (general) は自身の報告書に返信・補足をコメント可 (canCommentAsAuthor = currentRole === 'general' && report.userId === currentUserId)
- **表示条件**: canPostComment = canComment || canCommentAsAuthor が真であれば、コメント入力欄を表示
- **削除権**: 担当者はランダムな自投稿のみ削除可 (削除ボタンは comment.authorUserId === currentUserId の時のみ表示)
- **Placeholder 区別**: 
  - canCommentAsAuthor が真: 「上長への返信・補足を入力...」
  - それ以外: 「コメントを追加...」
- **表示順**: 上長氏名値 ➜ 日時 ➜ コメント本文

---

---

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

#### 自分の日報作成ボタン (MGR-5)
- **位置**: Dashboard 右上（「未確認カード」の上右）
- **スタイル**: `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700`
- **ラベル**: ✍️ 自分の日報を書く
- **動作**: onClick で `/today?self=1` へ navigate

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

**行数**: 230行（NAV-1 + GAP-1 反映後）

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
  - **循環**: 未確認一覧を循環状に充当（一番最後は起点）
  - クリックで `/reports/${target.date}?user=${target.userId}` へ navigate
- **スコープ制御**:
  - sortedAccessibleReports: currentRole と権限範囲からフィルタ
    - general: 自分のみ
    - manager: 自部下 + 同一チーム上長の部下
    - executive: 全会社
  - unconfirmedReports: isManagerView 時のみ status='submitted' を抽出、循環可能

**タイムラインセクション** (GAP-1):
- **位置**: メインコンテンツ左側（lg:col-span-2）、ナビゲーション下
- **見出し**: 📅 タイムライン
- **スキマ時間サマリ**: 見出し右に「スキマ計 N時間M分」を表示（gap の総時間が 0 分の場合は非表示）
- **空状態**: `report.blocks.length === 0` の場合、テキスト「記録がありません」（text-sm text-gray-400）

**ブロック行の構成**:
- **レイアウト**: flex gap-3 p-3 rounded-xl border
- **アイコン**: BLOCK_EMOJIS[type] （text-lg）
- **メタ情報**: startTime–endTime （text-xs text-gray-500）+ block.title （text-sm font-medium）
- **顧客表示**: block.customerId が存在する場合、「顧客: {customer.name}」を 2 行目に表示（text-xs text-gray-600 mt-0.5）
- **スタイル**: BLOCK_COLORS[type] で型別カラーリング

**スキマ時間（gap）行の構成** (GAP-1):
- **レイアウト**: flex items-center gap-3 px-3 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60
- **role**: `note`
- **aria-label**: `スキマ時間 {startTime}から{endTime} {formatGapDuration(durationMin)}`
- **アイコン**: ⏳ （text-base, aria-hidden=true）
- **テキスト**: `{startTime}–{endTime}` （text-amber-700, tabular-nums）+ 「スキマ時間」（text-amber-800 font-medium）+ `({formatGapDuration(durationMin)})` （text-amber-700）
- **並び順**: startTime 昇順（自動整列）

**buildTimelineWithGaps の動作**:
1. `report.blocks` を startTime 昇順にソート
2. 隣り合うブロック間の endTime → 次ブロック startTime の差が ≥5分（minGapMin デフォルト）の場合、gap を挿入
3. ブロック・gap が時刻順に混在した配列を返す
4. map で i.kind === 'gap' ? gap行 : block行 を分岐レンダリング

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

### SettingsPage (`src/pages/SettingsPage.tsx`)

**役割**: ユーザー設定画面。プロフィール、パスワード、クイックチップなど。

**メールアドレス変更申請** (M-1 UX修正):
- **表示**: メールアドレス欄を readonly 化
- **申請ボタン**: 「変更申請」ボタン追加
- **モーダル**: 申請用モーダル表示（新メールアドレス入力）
- **状態表示**: 申請待機中は「📋 申請待機中: <addr>」と表示

---

**未動作 UI 修正** (DEAD-1):

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

- **2026-06-03 319e32c**: AUTH-1/AUTH-2/AUTH-3/AUTH-4/AUTH-5 認証機能追加 — ログインガード・セッション失効・パスワード変更
- **2026-06-03 573fe49**: CAL-1/CUS-1 鳳凰殿 P2 改修 — カレンダー視認性・顧客一覧件数表示+ソート
- **2026-06-03 da74db3**: CUS-2 顧客対応履歴一覧刷新 — CustomerDetailPage 履歴セクション 1行=1ブロック表示、CustomersPage 履歴バッジ・履歴ボタン追加
- **2026-06-03 c059b47**: 鳳凰殿 UX ジャーニー改善 6件を反映
  - **NAV-1**: ReportDetailPage に日報前後ナビゲーション追加 (上長ビュー時は未確認循環値も)
  - **MGR-1**: TodayPage で上長ロール自動 redirect を `/dashboard` へ
  - **MGR-2**: Dashboard 未確認カードリンク先を `/search?status=submitted&auto=1` に変更、SearchPage で初期検索自動実行
  - **EMP-1**: TodayPage ヘッダー日付左右に前・翌日ナビボタン追加
  - **EMP-2**: Dashboard ヒートマップセル button 化、hover 状態改善、user param 付与
  - **LIST-1**: SearchPage 検索結果で author.name を先頭強調表示（上長以上のみ）
- **2026-06-04 694684f**: 主上ご下命 6 件 (CUS-3/MGR-3/MGR-4/MGR-5/MGR-6/DEAD-1) を反映
  - **CUS-3**: CustomerDetailPage 顧客対応履歴をタイムライン型カードレイアウトに刷新 (垂直軸ドット + 種別欄側 + 2列グリッド訪問結果)
  - **MGR-3**: SearchPage 一覧カードにミニタイムライン追加 (08:00〜20:00 を 100% 正規化した帯形式)
  - **MGR-4**: ReportDetailPage 上長コメントを担当者 (general) も返信可能に (canCommentAsAuthor 手柄)
  - **MGR-5**: Dashboard に「✍ 自分の日報を書く」ボタン追加, TodayPage は `?self=1` で上長迂回不可をバイパス
  - **MGR-6**: executive が manager の日報を確認可能 (撤変了、既存実装で要件充足)
  - **DEAD-1**: NotificationsPage handleClick を導入, SettingsPage の、通知・表示・スナップ select を controlled 化
- **2026-06-03 以前**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
