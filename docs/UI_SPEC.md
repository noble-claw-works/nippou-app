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

**P1 ログインロックアウト永続化 (e54993b 2026-06-06 本体実装、f2cd145/d8aae47 はテストのみで実装欠落)**:
- `failCount` 初期値: `useState` lazy initializer で `parseInt(localStorage.getItem('nippou_login_fails') ?? '0', 10)` を読み込み。`Number.isNaN` なら `0` にフォールバック
- `lockUntil` 初期値: `useState` lazy initializer で `parseInt(localStorage.getItem('nippou_login_lock_until') ?? '0', 10)` を読み込み
- ログイン失敗時: `failCount + 1` を `localStorage.setItem('nippou_login_fails', ...)` に同期
- 5 回失敗時: `Date.now() + 30 * 60 * 1000` を `lockUntil` state と `localStorage.setItem('nippou_login_lock_until', ...)` に保存
- ロック状態判定: `const isLocked = failCount >= 5 || lockUntil > now;`
  - `now` は `useEffect` + `setInterval(1000)` で 1秒ごと更新（カウントダウン表示用）
  - `lockUntil <= 0` の場合は interval 起動なし
- 正常ログイン時: `setFailCount(0)` / `setLockUntil(0)` + `localStorage.removeItem` で両キーをクリア
- **NaN ガード**: `Number.isNaN` で判定し破損データを `0` にフォールバック
- **ロック期間**: 30 分 (`LOCK_DURATION_MS = 30 * 60 * 1000`)
- **ロックバナー (UI)**: `isLocked` 時に `role="alert"` バナーを表示 (`bg-red-50 border border-red-300 rounded-xl`)
  - `lockUntil > now` の間: `Math.ceil((lockUntil - now) / 60000) 分後にロック解除` を表示
  - `lockUntil <= now` 且つ `failCount >= 5`: "ログイン失敗が5回に達しました。しばらお待ちください。"
- **ボタン制御**: `disabled={loading || isLocked}` / ラベル `isLocked ? 'ロック中' : 'ログイン'`
- **コンソール**: ログイン失敗時に `あと${5 - nextFail}回失敗するとロック` をエラーメッセージに追加
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

### CalendarPage (視認性改善 + 複数ビュー)

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

**CAL-2 複数ビュー切替（週・日・リスト）**:

#### ビュー切替ボタンセット
- **位置**:月ナビ下、月ビュー上
- **ボタン**: 【月】【週】【日】【リスト】【ヒート】
- **スタイル**: bg-gray-100 rounded-lg p-1 で統一
  - 非選択: text-gray-500 hover:text-gray-700
  - 選択中: bg-white shadow text-gray-900 font-medium
- **状態管理**: `view: 'month'|'week'|'day'|'list'|'heatmap'`

#### SubNav コンポーネント
- **使用ビュー**: 週・日ビュー専用
- **前/次ボタン**: ChevronLeft/Right icon
  - 週: 前週・翌週（date-fns `subWeeks/addWeeks`）
  - 日: 前日・翌日（date-fns `subDays/addDays`）
- **「今日」ボタン**: bg-blue-50 text-blue-700
- **ラベル表示**:
  - 週: 「M/d – M/d」（開始～終了日）
  - 日: 「yyyy年M月d日 (E)」（日本語ロケール）

#### WeekView コンポーネント
- **目的**: 1週 (月～日) を縦リスト表示
- **各日エントリ**:
  - **日付セル**: 曜日 (E) + 日付 (d)、今日なら bg-blue-600 text-white で丸形背景
  - **ステータス**: StatusBadge + ブロック数表示
  - **ミニタイムライン**: 帯形式 (h-6 bg-gray-50 rounded-md) で `calcMiniTimelineSegments` を利用
  - 各ブロック: 絶対位置で型別カラー emoji、hover で時刻・タイトルの tooltip
- **クリック動作**:
  - 日報がある: `/reports/{dateStr}` へ navigate
  - 日報がない: その日を選択、ビューを 'day' に切り替え
- **スタイル**: border-b border-gray-100 を各行の下に、最後の行は no border

#### DayView コンポーネント
- **目的**: 指定日付の全日報（一般社員は自分のみ、上長は全員）を ReadOnlyTimeline で並べて表示
- **権限制御**:
  - currentRole === 'general': 自分のみ (userId === currentUserId)
  - manager/executive: 該当日付の全報告書
- **フィルタ**: dayReports = reports.filter(r => r.date === dateStr && ...)
- **空状態**: 「M/d に該当する日報がありません」
- **各レポートカード**:
  - **ヘッダー**: 著者アバター + 名前 + StatusBadge + 「日報を開く →」ボタン
  - **本体**: `<ReadOnlyTimeline blocks={report.blocks} customers={customers} />`
  - **クリック**: `/reports/{dateStr}?user={userId}` へ navigate

#### ListView コンポーネント
- **目的**: 月内全日報をカード一覧（日付降順）
- **フィルタ**: startOfMonth ～ endOfMonth の範囲内、かつ権限範囲のレポートを抽出
- **並び順**: date 降順（新しい日付を上に）
- **空状態**: 「yyyy年M月 の日報はまだありません」
- **各カード行**:
  - **左**: 日付セル (w-14) に日付 (d) + 曜日 (E) + 月 (M月) を縦積み
  - **中央**: 著者名 (上長ビューのみ表示) + StatusBadge + 「ブロック数 · 訪問 N件」テキスト
  - **右**: 「開く →」リンク（text-blue-600）
  - **クリック**: `/reports/{dateStr}?user={userId}` へ navigate

---

### CustomersPage (件数表示・ソート・削除機能)

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

**CUS-3 顧客削除機能**:

#### 削除ボタン
- **位置**: アクション列（編集・履歴ボタン同列、右端）
- **ラベル**: 🗑 削除
- **表示条件**: currentRole が manager/executive/admin の場合のみ表示
- **スタイル**: px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50
- **クリック動作**: ConfirmDialog を表示（削除確認）

#### 削除確認ダイアログ
- **タイトル**: `${customer.name} を削除しますか？`
- **警告メッセージ**: 「⚠️ この操作は取り消せません。過去の日報から削除対象顧客の参照は無効化されます。」（赤テキスト）
- **推奨テキスト**: 「無効化（deactivateCustomer）の使用を推奨します」（灰色小文字）
- **ボタン**: 「キャンセル」「削除」（削除は red-600 background）
- **実行**: 確定時 `deleteCustomer(customerId)` を呼び出し、一覧から即座に削除
- **権限制御**:
  - `canDelete = currentRole === 'admin' || currentRole === 'executive'`
  - 上記のロール以外は削除ボタン表示なし

**P0 顔客削除権限: 付帯情報判定による分岐 (保安司 2026-06-04)**:

#### 付帯情報の定義
「顔客に付帯情報がある」 = 以下のいずれかに該当する顔客:
- `reports[].blocks[].customerId` にその顔客 ID が含まれる
- `reports[].todos[].customerId` にその顔客 ID が含まれる

#### 削除可否判定ロジック (`src/utils/customerAttachment.ts`)

| 顔客の状態 | 削除許可ロール |
|---|---|
| 付帯情報なし | ログイン中の任意ロール (general/manager/executive/admin) |
| 付帯情報あり | `admin` / `executive` のみ |
| 未ログイン (currentRole=undefined) | 常に不可 |

#### UI 制御 (CustomersPage 各顔客行)
- `canDeleteForCustomer(customer.id)`: `canDeleteCustomer(state, customerId, currentRole)` を行ごとに計算
- **付帯情報あり + 権限なし**: 削除ボタン `disabled` + ホバーツールチップ表示（「日報に付帯情報あり。削除は admin/executive のみ」）
- **付帯情報なし or 権限あり**: 削除ボタン enabled
- 編集モーダル内「危険ゾーン」の削除ボタンも同様に制御

#### ストア二層防御 (store/index.ts `deleteCustomer`)
- 付帯情報あり + `currentRole` が admin/executive 以外 → `console.warn` を出力して no-op で終了
- UI 制御とストア制御の二層構成で不正履行を阪止

#### 関連ユーティリティ (`src/utils/customerAttachment.ts`)
- `hasCustomerAttachment(state, customerId): boolean` — 付帯情報の有無を判定
- `canDeleteCustomer(state, customerId, currentRole): boolean` — 削除可否を統合判定
- テスト: `src/__tests__/customerAttachment.test.ts` (14 テスト)

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

## BUG-B [P0] UI層での読み取り専用化（2026-06-04）

**問題**: 提出済み・確認済み日報に関連する TODO が、store 層ではガードされているが UI 層では変更可能に見えていたため、ユーザが「過去データ改ざんが成立した」と錯覚する可能性があった。

**修正方針**: UI 層で完全読み取り専用化を実装。

### SidePanelCards / TodoCard の読み取り専用化

**コンポーネント**: `src/components/today/SidePanelCards.tsx` / `src/components/today/TodoCard.tsx`

**実装**:
- `SidePanelCards` に `isReadOnly` prop を導入（`report.status === 'submitted' || report.status === 'confirmed'`）
- `TodoCard` に `isReadOnly` を伝搬
  - **チェックボックス**: `disabled=true` / `aria-disabled=true` / `cursor-not-allowed` / `opacity-50` / `title="提出済み日報の TODO は変更できません"`
  - **＋追加ボタン**: `isReadOnly` 時は非表示（`hidden` / `display:none`）
  - **削除ボタン（X）**: `isReadOnly` 時は描画自体しない（条件付きレンダリング）
  - **インライン入力フォーム**: `disabled` でクリック無効化、enter キーも無視
  - **バッジ**: TODO ヘッダに「🔒 読み取り専用」バッジを表示（`isReadOnly` 時のみ）

**テスト** (`src/__tests__/todoCardReadOnly.test.tsx` / 12 件追加):
- `status='submitted'`: チェックボックス disabled / aria-disabled / ハンドラ無効 / バッジ表示 / ＋ボタン非表示 / 削除ボタン非描画
- `status='confirmed'`: 同上
- `status='planning'` / `'in_progress'` (対照群): チェックボックス enabled / ハンドラ実行 / バッジ非表示 / ＋ボタン表示 / 削除ボタン描画

### 二重防壁（store 層）

`src/store/index.ts` の `toggleTodo` / `updateTodo` / `deleteTodo` には、既存のガード（commit 5170401）を温存。
UI 層の disable のみでなく、万が一の API 突破アクセスに対しても no-op で対応。

**品質**:
- TypeScript: 0 error
- Vitest: 178/178 通過 (既存 166 + 新規 12)
- Build: 486.27 KB / gzip 135.16 KB
- Staging commit: `ae0ce12`

---

## BUG-B 残存修正 — Today 画面の期限切れ/提出済み由来 TODO 完全読み取り専用化 (db741db — 2026-06-04)

**背景**: commit ae0ce12 (BUG-B [P0]) は ReportDetail 画面および提出済み/承認済み日報由来の TODO 保護を実装したが、Today 画面特有の「期限切れ TODO 」（dueDate が今日未満）が変更可能なまま残っていた。

**修正方針**: `src/utils/todoReadOnly.ts` を新規作成し per-todo 判定ロジックを一元管理。UI 層と store 層の両方で判定を展開する。

### TODO 読み取り専用判定ルール（OR 結合）

| 会定 | 条件 |
|---|---|
| 提出済み/承認済み日報由来 | `report.status === 'submitted' \|\| report.status === 'confirmed'` |
| 期限切れ | `todo.dueDate !== undefined && todo.dueDate < today` (YYYY-MM-DD 文字列比較) |

どちらか一つでも即座に読み取り専用となる。

### `src/utils/todoReadOnly.ts` (新規)

```typescript
export function isTodoReadOnly(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string, // YYYY-MM-DD。省略時は実行時日付
): boolean

export function getTodoReadOnlyReason(
  todo: Pick<Todo, 'dueDate'>,
  reportStatus: ReportStatus,
  today?: string,
): string | null  // '提出済み日報の TODO は変更できません' | '期限切れの TODO は変更できません' | null
```

### `SidePanelCards.tsx` の変更 (per-todo 層展開)

- `todayStr = new Date().toISOString().split('T')[0]` をコンポーネント内で一度計算し、各 todo の計算に再利用
- 各 TODO 行で `isTodoReadOnly(todo, report.status, todayStr)` を呼び出し `todoReadOnly` フラグを算出
- `isBtnDisabled = isReadOnly || todoReadOnly` でチェックボックス・削除ボタンを無効化
- `handleToggle(todoId, todoReadOnly)` / `handleDelete(todoId, todoReadOnly)` のシグネチャを履年化（引数追加）

### store 層二層防御の残存修正

`toggleTodo` / `updateTodo` / `deleteTodo` 内のガードを `isTodoReadOnly` を使う形に更新：

```typescript
// 変更前 (ae0ce12)
if (!report || report.status === 'submitted' || report.status === 'confirmed') return;

// 変更後 (db741db)
const todo = report.todos.find(t => t.id === todoId);
const todayStr = new Date().toISOString().split('T')[0];
if (!todo || isTodoReadOnly(todo, report.status as TodoReportStatus, todayStr)) {
  console.warn('[store] toggleTodo blocked: todo is read-only', ...);
  return;
}
```

`toggleTodo` / `updateTodo` / `deleteTodo` の 3 アクション全てに適用。期限切れ TODO への操作を store 層でも封鎖する。

### テスト
- `src/__tests__/todoReadOnly.test.ts` (+新規 23 テスト): `isTodoReadOnly` / `getTodoReadOnlyReason` の全エッジケース
- `src/__tests__/todoCardReadOnly.test.tsx` (+4 テスト): overdue シナリオ追加

**品質**:
- TypeScript: 0 error
- Vitest: 201/201 通過 (既存 178 + 新規 23)
- Staging commit: `db741db`

---

### AdminPage (`src/pages/AdminPage.tsx`)

**役割**: ユーザー・チーム・監査ログの管理画面。`/admin` ルートで表示。

#### アクセス権限マトリクス

| ロール | 閲覧 | 編集 |
|---|---|---|
| admin | ✅ | ✅ |
| executive | ✅ (読取専用、黄色バナー表示) | ❌ |
| manager | ❌ Forbidden | — |
| general | ❌ Forbidden | — |

- **admin** はすべてのタブで作成・編集・削除・招待が可能
- **executive** はすべてのタブを閲覧のみ可能。ページ上部に黄色バナー「経営者ロールでは閲覧のみ可能です。編集・招待・削除は管理者が行ってください。」を表示
- **manager / general** はアクセス不可。`<ForbiddenState />` コンポーネントを表示

#### タブ構成

```
AdminPage
├── 👥 ユーザータブ  (UsersTab)
├── 🏢 チームタブ   (TeamsTab)
└── 📜 監査ログタブ (AuditLogTab)
```

タブ切り替え UI: `bg-gray-100 rounded-xl p-1` の pill 形式ボタンセット。選択中: `bg-white shadow font-medium text-gray-900`

---

#### 👥 ユーザータブ (`src/components/admin/UsersTab.tsx`)

**役割**: ユーザー一覧表示・招待・編集・無効化。

**Props**: `{ canEdit: boolean }`

##### ユーザー一覧行

各ユーザー行に以下の情報を表示:
- **アバター**: `w-8 h-8 rounded-full bg-blue-100 text-blue-700`、`avatarInitials` を表示
- **氏名** + メールアドレス + **ロールバッジ** (`bg-gray-100 text-gray-600 rounded-full`)
- **無効ラベル**: `status === 'inactive'` の場合、赤テキスト「無効」を表示
- **所属チーム**: `user.teamIds` が存在する場合、`text-xs text-gray-400` でチーム名をカンマ区切り表示
- **上長表示**: `上長: ○○○ (チーム経由)` または `上長未設定`
  - `getManagersOf(user.id, users, teams)` を使用して取得
  - 複数の上長がいる場合はカンマ区切りで列挙し、`(チーム経由)` サフィックスを付与

##### 操作ボタン（canEdit 時のみ表示）

- **「✎ 編集」ボタン**: `px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50` → `UserEditModal` を開く
- **「無効化」ボタン**: `status === 'active'` のみ表示 → `text-xs text-red-600 border border-red-200` → ConfirmDialog を経由して `deactivateUser()` を呼び出し

##### ユーザー招待モーダル

- 「＋招待」ボタンから開く (`bg-blue-600 text-white`)
- フィールド: **氏名 (必須)** / **メールアドレス (必須)** / **ロール** (セレクト)
- 確定: `addUser({ ..., status: 'invited' })` → `addToast('招待メールを送信しました')`

---

#### ✎ ユーザー編集モーダル (`src/components/admin/UserEditModal.tsx`)

**Props**: `{ user: User | null, teams: Team[], onClose, onSave }`

**編集可能フィールド**:

| フィールド | 入力形式 | 備考 |
|---|---|---|
| 氏名 | テキスト入力（必須） | 先頭文字が `avatarInitials` に自動反映 |
| メールアドレス | email 入力（必須） | |
| ロール | セレクトボックス | general / manager / executive / admin |
| 所属チーム | チェックボックス一覧 (最大高さ h-40 スクロール) | 複数チーム選択可 |

- **保存ボタン**: 氏名・メール未入力時は `disabled`
- **確定**: `onSave(user.id, updates)` → `updateUser()` + `addToast('ユーザー情報を更新しました')`

---

#### 🏢 チームタブ (`src/components/admin/TeamsTab.tsx`)

**役割**: チーム一覧表示・新規作成・編集・削除。

**Props**: `{ canEdit: boolean }`

##### チーム一覧行

各チーム行に以下の情報を表示:
- **チーム名**: `🏢 {team.name}`（font-medium）
- **説明文**: 存在する場合 `text-xs text-gray-500` で表示
- **上長 + メンバー数サマリー**: `上長: ○○○ · メンバー: N名`
- **メンバー名一覧**: `members.join(', ')` を `text-xs text-gray-400` で表示

##### 操作ボタン（canEdit 時のみ表示）

- **「✎ 編集」ボタン**: `text-blue-600 border border-blue-200` → `TeamEditModal` を開く
- **「削除」ボタン**: `text-red-600 border border-red-200` → ConfirmDialog (チーム名入力確認あり) → `deleteTeam()`

##### チーム新規作成モーダル

- 「＋新規作成」ボタンから開く
- フィールド: **チーム名 (必須)** / **説明**
- 確定: `addTeam({ name, description, managerIds: [], memberIds: [] })` → `addToast('チームを作成しました')`

---

#### ✎ チーム編集モーダル (`src/components/admin/TeamEditModal.tsx`)

**Props**: `{ team: Team | null, users: User[], onClose, onSave }`

**編集可能フィールド**:

| フィールド | 入力形式 | 備考 |
|---|---|---|
| チーム名 | テキスト入力（必須） | |
| 説明 | テキスト入力 | |
| メンバー | チェックボックス一覧 (最大高さ h-44) | `status === 'active' \| 'invited'` のユーザーのみ表示 |
| 上長 | チェックボックス一覧 (最大高さ h-36) | **メンバーから選択**。メンバー未選択時は「先にメンバーを追加してください」を表示 |

**連動ルール**:
- メンバーのチェックを外すと、同ユーザーは上長からも自動的に除外される
- 上長はメンバーに含まれているユーザーのみ選択可能

- **保存ボタン**: チーム名未入力時は `disabled`
- **確定**: `onSave(team.id, { name, description, memberIds, managerIds })` → `updateTeam()` + `addToast('チーム情報を更新しました')`

---

#### 📜 監査ログタブ (AuditLogTab — AdminPage 内部コンポーネント)

- `auditLogs` を `createdAt` 降順でソートして表示
- 各行: ユーザーアバター + 氏名 + アクション + 結果バッジ（成功: `bg-green-100 text-green-700` / 失敗: `bg-red-100 text-red-700`）+ 日時 + IP アドレス

---

## 改修履歴

- **2026-06-06 d13c0f6 / cea9756**: ユーザー管理画面拡張 — `UsersTab` / `TeamsTab` / `UserEditModal` / `TeamEditModal` を追加。ユーザー一覧に上長表示 (getManagersOf)。チーム編集にメンバー・上長指定 UI を追加。`executive` ロールの読取専用アクセスと黄色バナーを実装。`AdminPage` をタブ別サブコンポーネントに分割
- **2026-06-06 40e081e**: 部下→上長への能動コメント機能追加 — コメントセクション名を「上長コメント」→「コメント」に変更、部下 (general) が自身日報に上長宛コメントを能動投稿可能に。緑系アバター + 「↑ 上長宛」バッジで視覚区別。authorRole フィールドを ManagerComment に追加
- **2026-06-06 94ed85b**: BUG-A 真の修正 — `ReadOnlyTimeline` (确認用画面) を Today `TimelinePanel` と同一の「◀ 予定 | 実績 ▶」 2 カラム並列レイアウトに統一。sm ブレークポイント（≥640px）で横並び 2 列（時刻軸 40px + 予定 1fr + 1px セパレータ + 実績 1fr）、sm 未満で予定→実績縦積み。`variant='planned'|'actual'` は単一カラムで後方互換維持。ReportDetailPage 外側 `bg-white rounded-xl p-4 + <h2>` ラッパー撤去。`data-testid="timeline-planned-col"` / `"timeline-actual-col"` 追加。e2e `buga-layout.spec.ts` 拡張
- **2026-06-04 db741db**: BUG-B 残存修正 — Today 画面の期限切れ/提出済み由来 TODO を完全読み取り専用化。`src/utils/todoReadOnly.ts` を新規作成し `isTodoReadOnly` / `getTodoReadOnlyReason` を一元管理。SidePanelCards で per-todo 期限切れ判定を追加し UI 層を拡張。store 層 `toggleTodo` / `updateTodo` / `deleteTodo` も期限切れ TODO を二層防御でガード
- **2026-06-04 ae0ce12**: BUG-B [P0] submitted/confirmed 日報の TODO を UI 層で完全読み取り専用化 — チェックボックス disabled / ＋ボタン非表示 / 削除ボタン非描画 / 🔒 読み取り専用バッジ表示。store 層の既存ガードを二重防壁として温存
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
- **2026-06-04 90a69fe**: E-7 NotFoundPage と catch-all ルートを実装 — 未定義 URL で 404 ページを表示
- **2026-06-04 139386b**: E-8 顧客削除後の過去日報で「不明」表示に統一 — ReadOnlyTimeline / SidePanelCards / SearchPage の顧客名フォールバックを ID 表示から「不明」へ変更
- **2026-06-04 694684f**: 主上ご下命 6 件 (CUS-3/MGR-3/MGR-4/MGR-5/MGR-6/DEAD-1) を反映
  - **CUS-3**: CustomerDetailPage 顧客対応履歴をタイムライン型カードレイアウトに刷新 (垂直軸ドット + 種別欄側 + 2列グリッド訪問結果)
  - **MGR-3**: SearchPage 一覧カードにミニタイムライン追加 (08:00〜20:00 を 100% 正規化した帯形式)
  - **MGR-4**: ReportDetailPage 上長コメントを担当者 (general) も返信可能に (canCommentAsAuthor 手柄)
  - **MGR-5**: Dashboard に「✍ 自分の日報を書く」ボタン追加, TodayPage は `?self=1` で上長迂回不可をバイパス
  - **MGR-6**: executive が manager の日報を確認可能 (撤変了、既存実装で要件充足)
  - **DEAD-1**: NotificationsPage handleClick を導入, SettingsPage の、通知・表示・スナップ select を controlled 化
- **2026-06-06 0450936**: E-8 真の原因修正 — Zustand store 非永続化を根本解決。`src/store/deletedCustomers.ts` 新規作成・`deleteCustomer` 時に `persistDeletedCustomerId` で ID を localStorage に保存。store 初期化時に seed data からフィルタアウト。`resetAll` 時に localStorage クリア。`e2e/e8-deletedCustomer.spec.ts` 3テスト追加 (SPA nav / リロード永続化 / URL 直接アクセス)
- **2026-06-06 e54993b**: P0/P1 本体実装 — CustomersPage.tsx に per-customer 削除権限制御 (canDeleteCustomer + hasCustomerAttachment 適用、disabled + title ツールチップ、編集モーダル危険ゾーンも同様)、LoginPage.tsx に localStorage 永続化・ロックバナー・カウントダウン・ボタン disabled を実装。store/index.ts deleteCustomer に二層防御追加。`e2e/customer-delete-role.spec.ts` 5テスト + `e2e/login-lockout.spec.ts` 4テスト追加
- **2026-06-04 8ccb832**: 保安司 P0 — `src/utils/customerAttachment.ts` (付帯情報判定ユーティリティ) と単体テストを新規作成（UI/Store への組み込みは e54993b で完成）
- **2026-06-04 f2cd145**: 保安司 P1 — ログインロックアウトのユーティリティとテストを新規作成（LoginPage.tsx への組み込みは e54993b で完成）
- **2026-06-03 以前**: BlockModal バリデーション + 訪問結果アコーディオン (M-2/W-2), BlockCard メモ表示 (P1-3), Todo ステータス・優先度・期限 (P1-2), ThemeCard 3段レイアウト (P1-1), ComplimentsCard (P0-2), ManagerCommentSection/Card (P0-1), SettingsPage メール変更申請 (M-1) を反映
