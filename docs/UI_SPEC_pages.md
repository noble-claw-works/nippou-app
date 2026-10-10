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

**E-9 ヘッダーロール切替メニューの永続化 (a5eb23c 2026-06-06)**:
- ロール切替メニューでロールを切り替えると `setRole(role)` が呼ばれ、選択ロールが localStorage (`nippou.currentRole.v1`) に即座保存される
- ページリロード後も選択したロールが維持される（E-9 修正前はリロードでロール選択が初期値に戻るバグがあった）
- ログイン直後はログインユーザー本来のロールに戻る（`login()`/`loginAsUser()` 時に localStorage の切替記録をクリア）

| 濃作 | ロール切替記録 |
|---|---|
| ロール切替メニューから切替 | `nippou.currentRole.v1` / `nippou.currentUserId.v1` に保存 |
| ページリロード | localStorage から復元し切替後のロールを維持 |
| ログイン | localStorage 削除 → ログインユーザー本来のロールを適用 |
| ログアウト | localStorage 削除 |
| リセット | localStorage 削除 |

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

### HouseholdsPage (`src/pages/HouseholdsPage.tsx`) — Phase 1

**役割**: 世帯（Household）一覧表示。旧 CustomersPage の保険営業ドメイン対応版。`/households` ルートで表示。

> **ルート変更**: `/customers` は `/households` にリダイレクト。`/customers/:id` は `/households/:id` にリダイレクト。

**ナビゲーション**: サイドバーのラベルが「顧客」→「世帯」に変更。

#### 主要機能

- **世帯一覧**: 名前・エリア・タグ・最終接触日・次回アポを表示
- **世帯員数バッジ**: 各世帯カード / 行に「👨‍👩‍👧 N 名」バッジを表示（`persons` State から `householdId` でフィルタして算出）
- **検索・フィルタ**: 既存 CUS-1 のソート機能（名前昇降順・最終接触新順・次回AP近順・登録新順）を継承
- **件数表示**: 「全 N 件（全世帯 M 件中）」（フィルタ時に表示）
- **お気に入り表示**: ⭐ お気に入り世帯を上位表示

#### 世帯カード行の表示フォーマット

```
[⭐] 世帯名 (エリア) | 世帯タイプバッジ | 👨‍👩‍👧 N 名 | 最終接触: YYYY/MM/DD | 次回AP: MM/DD
```

**法人世帯 (corporate)** はラベル「法人」、`familyMemo` をメモとして表示。法人世帯は Phase 1 以降も存続する。

#### アクション列

- **「詳細 →」ボタン**: `/households/:id` へ navigate
- **「✎ 編集」ボタン**: 世帯情報編集モーダル
- **「削除」ボタン**: 既存 CUS-3 権限制御を継承（admin/executive のみ、付帯情報なし or 高権限）

---

### HouseholdDetailPage (`src/pages/HouseholdDetailPage.tsx`) — Phase 1

**役割**: 世帯詳細表示。世帯基本情報 + 世帯員（Person）セクション + 対応履歴。`/households/:customerId` ルートで表示。

#### レイアウト構成

```
HouseholdDetailPage
├── ヘッダー: 世帯名 + タイプバッジ + エリア + 担当者 + アクション
├── 世帯基本情報カード
│   ├── familyMemo (家族構成メモ)
│   ├── tags / memo / nextAppointment 等
│   └── 世帯主: headPersonId → Person.name を解決して表示
├── 👨‍👩‍👧 世帯員セクション
│   ├── Person カード一覧
│   └── 「＋ 世帯員を追加」ボタン
└── 📅 対応履歴セクション (旧 CustomerDetailPage と同等)
```

#### 👨‍👩‍👧 世帯員セクション

**Person カード一覧**:
- 各カードに: 氏名 / かな / 続柄バッジ / 生年月日（年齢を計算して表示）/ 性別 / 職業 / 喫煙有無 / 健康情報メモ
- **続柄バッジカラー**:
  - `head`: bg-blue-100 text-blue-700（世帯主）
  - `spouse`: bg-pink-100 text-pink-700（配偶者）
  - `child`: bg-green-100 text-green-700（子）
  - `parent`: bg-amber-100 text-amber-700（親）
  - `sibling`: bg-purple-100 text-purple-700（兄弟姉妹）
  - `other`: bg-gray-100 text-gray-700（その他）
- **世帯主マーク**: `relation === 'head'` かつ `household.headPersonId === person.id` の場合に「👑 世帯主」バッジを表示
- **喫煙バッジ**: `smoker === true` で 🚬 バッジを表示

**操作ボタン**:
- **「✎ 編集」ボタン**: 各 Person カードに表示 → `PersonEditModal` を開く
- **「✕ 削除」ボタン**: 各 Person カードに表示 → ConfirmDialog → `deletePerson(personId)`
- **「＋ 世帯員を追加」ボタン**: セクション末尾 → `PersonEditModal` を空フォームで開く

---

### PersonEditModal (`src/components/household/PersonEditModal.tsx`) — Phase 1

**役割**: Person（世帯員）の追加・編集モーダル。

#### Props

```typescript
interface Props {
  householdId: string;       // 所属世帯 ID
  person?: Person | null;    // null の場合は新規追加モード
  household: Household;      // 世帯主付け替えのため
  onClose: () => void;
  onSaved?: () => void;
}
```

#### フィールド一覧

| フィールド | 入力形式 | 必須 | 備考 |
|---|---|---|---|
| 氏名 | テキスト入力 | ✅ | |
| かな | テキスト入力 | — | |
| 続柄 | セレクトボックス | ✅ | head / spouse / child / parent / sibling / other |
| 生年月日 | date 入力 | — | YYYY-MM-DD |
| 性別 | ラジオボタン | — | M / F / other |
| 職業 | テキスト入力 | — | |
| 喫煙 | チェックボックス | — | |
| 健康情報 | テキストエリア | — | |
| メモ | テキストエリア | — | |

#### 世帯主付け替え機能

- 編集対象 Person の続柄が `head` でない場合に「この世帯員を世帯主に設定する」チェックボックスを表示
- チェックオン: 保存時に `updatePerson(person.id, { relation: 'head' })` + `updateCustomer(householdId, { headPersonId: person.id })` を実行
- 旧世帯主の `relation` は `'other'` に変更（自動降格）

#### バリデーション

- 氏名必須（空文字列で保存不可）
- 続柄必須（セレクト未選択で保存不可）

#### 使用例

```tsx
// 新規追加
<PersonEditModal
  householdId="c1"
  person={null}
  household={household}
  onClose={() => setModalOpen(false)}
  onSaved={() => refetch()}
/>

// 編集
<PersonEditModal
  householdId="c1"
  person={existingPerson}
  household={household}
  onClose={() => setModalOpen(false)}
/>
```

---

### CustomersPage (件数表示・ソート・削除機能) [**旧ページ / デッドコード - 削除候補**]

> ⚠️ **注稘**: この CustomersPage セクションは Phase 1 以前の旧ページであり、現在。`/customers` ルートは `/households` へリダイレクトされています。CUS-1~CUS-3 の仕様詳細は HouseholdsPage 詳細に統合済み。本セクションは参考資料として保持しています。

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
- **クリック動作**: `/households/{id}#history` へ navigate
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

