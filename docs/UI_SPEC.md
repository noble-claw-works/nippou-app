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

**CUS-2 顧客対応履歴セクション**:

#### レイアウト
- **セクション ID**: `id="history"` → URL ハッシュ `#history` で scrollIntoView
- **トリガー**: 1. URL ハッシュ `#history` で useEffect が `el.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- **構成**: `<section id="history">` + ヘッダー（「📅 対応履歴」+ 件数 + "新しい順" ラベル）+ リスト

#### 空状態
- テキスト: 「対応履歴がありません」
- スタイル: text-sm text-gray-400 py-6 text-center

#### 履歴エントリ列
- **単位**: 1 行 = 1 TimeBlock（従来の report 単位ではない）
- **並び順**: reportDate 降順 → 同日 startTime 降順
- **ソース**: historyEntries = 全 reports を走査 → 該当 customerId を含む block を平める → ソート

#### 各エントリの構成

**1 行目: メタ情報バー**
```
📅 YYYY-MM-DD  🕐 HH:MM 〜 HH:MM  [種別バッジ]  👤 担当者名  [「予定」バッジ（isActual=false時）]
```
- `📅`: Calendar icon
- 日付: reportDate
- `🕐`: Clock icon
- 時刻: block.startTime 〜 block.endTime（不在なら "--:--"）
- **種別バッジ**: bg-gray-100 rounded-full → `${BLOCK_EMOJIS[type]} ${BLOCK_LABELS[type]}`
- **担当者**: User icon + handler.name（報告者）
- **「予定」バッジ**: isActual=false 時のみ → bg-amber-50 text-amber-700 rounded text-[10px]
- **flex items-center gap-x-3 gap-y-1 text-xs text-gray-500**

**2 行目: タイトル**
- block.title が存在する場合のみ表示
- mt-1 text-sm font-medium text-gray-900

**3 行目: メモ**
- block.memo が存在する場合のみ表示
- mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words（改行・空白を保持）

**4 行目以降: 訪問結果詳細**
- **表示条件**: result || proposal || collected || nextAppointment のいずれかが存在する場合
- mt-2 space-y-1 text-xs

```
📄 結果: {block.result}        ← FileText icon, text-blue-500
💡 提案: {block.proposal}      ← emoji, text-purple-600
✅ 集金済                       ← CheckCircle2 icon, green-50/green-700
📆 次回: {block.nextAppointment} ← emoji, blue-50/blue-700
```

#### クリック動作
- **要素**: 各エントリ li 内の button
- **`onClick`**: `/reports/{reportDate}` へ navigate
- **`aria-label`**: `${reportDate} ${startTime}〜${endTime} ${typeLabel} の日報を開く`
- **ホバー**: bg-blue-50 rounded-lg transition-colors
- **フォーカス**: focus:outline-none focus:ring-2 focus:ring-blue-500

#### 列のスタイル
```tsx
<ul className="divide-y divide-gray-100">
  {historyEntries.map(({ block, ... }) => (
    <li key={block.id}>
      <button className="w-full text-left py-3 px-2 -mx-2 hover:bg-blue-50 rounded-lg ...">
        {/* メタ情報バー */}
        {/* タイトル */}
        {/* メモ */}
        {/* 訪問結果 */}
      </button>
    </li>
  ))}
</ul>
```

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

**行数**: 190行（MGR-2/LIST-1 反映後）

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
- **2026-06-03 以前**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
