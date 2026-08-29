# 日報ステータス遷移仕様

---

## 認証セッションフロー（AUTH-1/AUTH-2）

### 認証状態遷移図

```
未認証
  ↓ ユーザーアクセス → /login
  ↓ login() / loginAsUser()、localStorage 保存
  ↓ authSession 設定 →【認証済み】
  ↓ /today へナビゲート
認証済み
  ↓ ユーザー操作 (30秒毎) → touchSession: expiresAt +30分延長
  ├ 30秒無操作 → expiresAt に到達
  ↓ logout()→【未認証】
  ↓ /login へナビゲート、トースト「セッションが切れました」
```

### 認証アクション

| アクション | 設置項目 | 条件/戻り値 |
|---|---|---|
| `login(email, password)` | authSession, currentRole, currentUserId, users[].lastLogin | ✅ ok: true, user \| ❌ ok: false, error |
| `loginAsUser(userId)` | authSession, currentRole, currentUserId, users[].lastLogin, localStorage | ユーザー ID 存在時に実行 |
| `logout()` | authSession=null, localStorage 削除 | — |
| `isAuthenticated()` | 判定ロジック | ✅/❌。expiresAt チェック付き。期限切れなら自動 logout() |
| `touchSession()` | expiresAt = now + 30分 | authSession 存在時 |
| `changePassword(userId, current, next)` | passwords[userId] = next | ✅ ok: true \| ❌ ok: false, error (4文字以上、current と異なる) |

### localStorage 保持管理

**キー**: `'nippou.auth.v1'`

**保持内容**:
- ログイン時 `loginAt`, `expiresAt` を ISO 8601 文字列で格納（暗号化不要）
- 起動時（モジュール初期化）に `loadAuthSession()` を呼び出し、有効なら認証済み状態でブート
- logout() 時に削除

**セッション有効期限**: 30 分無操作で失効。操作イベント（click/keydown/mousemove/touchstart）で touchSession() を呼び、expiresAt を延長

---

## ステータス一覧

| ステータス | 表示名 | 説明 |
|---|---|---|
| `planning` | 予定入力中 | 日報作成直後。予定ブロックのみ入力可 |
| `in_progress` | 実績入力中 | 予定確定後。予定・実績どちらも入力可 |
| `submitted` | 提出済み | 提出後。変更不可・未承認なら取り下げ可。上長コメント表示 |
| `confirmed` | 承認済み | 上長承認後。完全読み取り専用 |

## 遷移図

```
planning ──[予定を確定する]──→ in_progress ──[提出する]──→ submitted
                                    ↑                        ↓
                                    └──[取り下げ / 差し戻し]──┘
                                                              ↓ 上長承認
                                                          confirmed
```

## 操作制限

| 操作 | planning | in_progress | submitted | confirmed |
|---|---|---|---|---|
| 予定ブロック 追加/編集/削除 | ✅ | ✅ | ❌ | ❌ |
| 実績ブロック 追加/編集/削除 | ❌ | ✅ | ❌ | ❌ |
| テーマ/感謝/振り返り編集 | ✅ | ✅ | ❌ | ❌ |
| 実績化ボタン | ❌ | ✅ | ❌ | ❌ |
| お褒め記録（追加・削除） | ✅ | ✅ | ❌ | ❌ |
| 上長コメント表示 | ❌ | ❌ | ✅ | ✅ |
| 上長コメント返答 | ❌ | ❌ | ✅ | ✅ |
| 取り下げ | — | — | ✅（未承認時のみ） | ❌ |

---

## TODO 編集可否フロー (BUG-B + BUG-B 残存修正)

### 判定ルール

TODO の編集可否は以下の OR 条件で判定する。**どちらか一つで即座に読み取り専用となる**。

| 条件 | 読み取り専用になる理由 | commit |
|---|---|---|
| `report.status ∈ ['submitted', 'confirmed']` | 提出済み/承認済み日報由来の保護 | ae0ce12 |
| `todo.dueDate < today` (YYYY-MM-DD 文字列比較) | 期限切れ TODO の変更防止 | db741db |

```
todo
  ├── report.status in ['submitted', 'confirmed']?
  │     Yes → 🔒 読み取り専用 ("提出済み日報の TODO は変更できません")
  ├── todo.dueDate && todo.dueDate < today?
  │     Yes → 🔒 読み取り専用 ("期限切れの TODO は変更できません")
  └── のどちらでもない
        → ✅ 編集可能
```

### ae0ce12 vs db741db の関係性

| | ae0ce12 (BUG-B [P0]) | db741db (BUG-B 残存修正) |
|---|---|---|
| **適用画面** | ReportDetail 画面中心 | Today 画面中心 |
| **保護トリガー** | submitted / confirmed 日報ステータス | submitted / confirmed ⊕ 期限切れ（両方） |
| **判定粒度** | 日報単位（`isReadOnly` prop） | per-todo 単位（`isTodoReadOnly(todo, status, today)`） |
| **ユーティリティ** | 標準ロール比較 | `src/utils/todoReadOnly.ts` 一元管理 |
| **store ガード** | status のみでブロック | `isTodoReadOnly` でブロック（期限切れも含む） |

### 実装コンポーネント

| 層 | コンポーネント | 役割 |
|---|---|---|
| 共通ロジック | `src/utils/todoReadOnly.ts` | `isTodoReadOnly` / `getTodoReadOnlyReason` |
| UI 層 | `src/components/today/SidePanelCards.tsx` | per-todo `isBtnDisabled` 判定・表示制御 |
| store 層 | `src/store/index.ts` | `toggleTodo` / `updateTodo` / `deleteTodo` ガード |

---

## 提出フロー

### status による提出状態管理

| 操作 | status 遷移 | submittedAt | confirmedAt | confirmedBy |
|---|---|---|---|---|
| `confirmPlanning()` | `planning` → `in_progress` | — | — | — |
| `submitReport()` | `in_progress` → `submitted` | セット（現在時刻） | — | — |
| `withdrawReport()` | `submitted` → `in_progress` | クリア | — | — |
| `confirmReport()` | `submitted` → `confirmed` | 変化なし | セット（現在時刻） | セット (currentUserId) |
| `bulkConfirmReports(reportIds[])` | 複数 `submitted` → `confirmed` | 変化なし | セット（現在時刻） | セット (currentUserId) |

**一括確認の実装** (MGR-4):
- Store action `bulkConfirmReports(reportIds: string[]): number`
- 入力: status='submitted' の日報 ID 配列
- 処理: 各 ID に対し `confirmReport()` を内部実行。**partial commit (部分適用、ロールバックなし)**。status !== 'submitted' の ID はスキップし、成功件数のみ返す
- 戻り値: 実際に confirmed 状態にした件数

**状態判定**: `status` enum で状態判定を行う（boolean フラグは廃止）。「提出済みか否か」は `status === 'submitted' || status === 'confirmed'` で判定する。

## 差し戻しの扱い

上長による差し戻しは「取り下げ」と同動作（`status: submitted → in_progress`）。
担当者は実績を修正し、再度「提出する」で再提出できます。

## in_progress 時の提出ヘッダーカード (P0-1)

`status='in_progress'` 時に、TodayPage 上部に提出ヘッダーカードを表示:

```
[blue-50 上部カード]
実績入力が完了しました
確認して上長に提出します
[📤 日報を提出する] ボタン
```

- 削日下部の StatusBar の提出ボタンと重複表示で OK（両方から操作可能）
- submitted に遷移後は緑色「✅ 提出済み」バッジに変更

## 実装ファイル

- `src/types/index.ts` — `ReportStatus` / `DailyReport` 型定義
- `src/store/index.ts` — `confirmPlanning` / `submitReport` / `withdrawReport` / `confirmReport`
- `src/pages/TodayPage.tsx` — ブロック操作ガード (`canEditPlanned` / `canEditActual` / `isReadOnly`)
- `src/components/today/StatusBar.tsx` — ステップインジケーター + ステータス別ボタン
- `src/components/ui/StatusBadge.tsx` — ステータスバッジ表示

## 上長コメント・返答フロー

- **表示タイミング**: `status='submitted'` または `status='confirmed'` の時のみ表示
- **コメント入力**: 上長ロール（manager/executive/admin）が `submitted` 日報にコメント追加
- **部下の返答**: `reply-to-comment` ボタンで ✅YES（了承）/ ❌NO（要相談）を選択
- **返答の永続性**: 一度返答すると、返答ステータス + 日時が表示され、ボタンは非活性化

## 上長ビュー特定ルーティング (NAV-1/MGR-1/EMP-2)

| 現在ページ | currentRole | 動作 |
|---|---|---|
| TodayPage | manager/executive | `/dashboard` へ自動 redirect (replace=true) |
| TodayPage | manager/executive + `?self=1` | redirect 不要 (自分の日報作成モード) |
| ReportDetailPage | general | 自分の日報のみ前後ナビ |
| ReportDetailPage | manager/executive | 範囲内各日報の前後ナビ + 未確認循環ナビ |
| DashboardPage | (all) | 上長以上のみアクセス可能 |
| **未定義パス** | (all) | `NotFoundPage` を描画 (catch-all `path="*"`) |

---

## catch-all ルートと NotFoundPage (E-7)

### ルート定義

```tsx
// src/App.tsx 内 AppLayout > Routes の末尾
<Route path="*" element={<NotFoundPage />} />
```

### 挙動

- **認証済み**: `RequireAuth` 内部のルートなので、未認証ユーザーがヒットしても `/login` へリダイレクトされ、`NotFoundPage` は表示されない。
- **認証済み**: 完全に未定義な URL（例: `/nonexistent`, `/admin/foo`）へのアクセス時に `NotFoundPage` を表示する。
- `AppShell`（サイドダー / ヘッダー）は通常通り描画される。

### テストカバレッジ

`e2e/notfound.spec.ts` に以下シナリオをカバー:
- `/nonexistent` へのアクセスで 404 ページが表示される
- 「トップへ戻る」リンクが表示され、クリックでトップページへ移動する
- `h1` に「404」文字列を含む

**上長ビューの未確認循環ナビ**:
- 初料粗い結果一覧 (status='submitted' のみ) を出力。unconfirmedReports を数える
- 現在インデックスを基礎に前/次を決定し、循環可能 (一覧を貴すよう会綬の下)

---

## 顧客削除後のルーティング影響 (E-8)

`deleteCustomer` は日報データに影響しないため、顧客削除後も `ReportDetailPage` / `SearchPage` へのルーティングはそのまま機能する。だだし照了事項：

- `customerId` を URL パラメータとして受けるページ（`CustomerDetailPage` など）は、削除済み顧客が指定された場合に別途ハンドリングが必要。現在はデフォルトがないため、これらのページへのリンクは履歴カードから容易に迅例されない設計となっている。
- 日報内 `block.customerId` による履歴表示は `'不明'` フォールバックにより安全に描画する。

---

## 顧客削除フロー: 付帯情報あり/なしの分岐 + 削除 ID 永続化 (e54993b/0450936 2026-06-06)

> **注意 (8ccb832/d8aae47 の訂正)**: `8ccb832` ではユーティリティとテストのみで UI/Store への組み込みが欠落していた。真の本体実装は `e54993b`。

### トリガー
`CustomersPage` 各顧客行の削除ボタンがクリックされる。

### 分岐フロー (e54993b で実装)

```
削除ボタンクリック
  └→ hasCustomerAttachment(attachmentState, customerId) + canDeleteCustomer(...) を per-行で評価
       ├→ [canDelete=false] disabled ボタン + title ツールチップ「付帯情報あり: admin/executive のみ削除可」
       └→ [canDelete=true]  ConfirmDialog を表示
                  ├→ [Cancel] 何もしない
                  └→ [Confirm] deleteCustomer(customerId) 呼び出し
                               ├→ [store 内: 付帯情報あり + non-admin/exec] console.warn + no-op (二層防御)
                               └→ [削除許可] persistDeletedCustomerId(customerId) で localStorage に保存
                                            → 顧客レコードをストアから削除
```

### 削除後の永続化 (0450936/e54993b で実装)

```
ページリロード / URL 直接アクセス
  └→ store 初期化: loadDeletedCustomerIds() で nippou.deletedCustomerIds.v1 を読み込む
       └→ CUSTOMERS.filter(c => !_deletedCustomerIds.has(c.id)) でフィルタアウト
            └→ 削除した顧客が seed data から復元されない
```

### `canDeleteForCustomer(customerId)` の評価ルール

| `hasCustomerAttachment` | currentRole | canDelete |
|---|---|---|
| false (付帯情報なし) | general / manager / executive / admin | **true** |
| true (付帯情報あり) | admin / executive | **true** |
| true (付帯情報あり) | general / manager | **false** |
| どちらでも | undefined (未ログイン) | **false** |

### ストア内二層防御 (e54993b)
`deleteCustomer` アクションは内部でも同様の判定を実施する。UI を迂回した直接呼び出しも防ぐ。
`console.warn('[security] deleteCustomer blocked: 付帯情報あり customer は admin/executive のみ削除可')` を出力。

---

## ログインロック状態遷移 (e54993b 2026-06-06)

### 状態遷移図

```
[通常状態]
  └→ ログイン失敗: failCount++ → localStorage 保存
       ├→ [failCount 1〜4] エラーメッセージ「あと N 回失敗するとロック」表示
       └→ [failCount = 5] lockUntil = Date.now() + 30分 → localStorage 保存
                           → isLocked = true
                           → ロックバナー + ボタン disabled 表示
[ロック状態]
  └→ 毎秒: setInterval で now を更新し残り時間カウントダウン表示
       └→ [Date.now() >= lockUntil] isLocked = false → 通常状態に復帰
[ページリロード時]
  └→ useState lazy init で localStorage から failCount / lockUntil を読み込み
       └→ ロック中なら isLocked = true を維持
[ログイン成功時]
  └→ setFailCount(0) + setLockUntil(0) + localStorage.removeItem で両キーをクリア
```

---

---

## ReadOnlyTimeline 表示モード (variant) 定義 (94ed85b 2026-06-06)

`ReadOnlyTimeline` コンポーネントは `variant` prop で表示モードを切り替える。

| variant | レイアウト | 用途 |
|---|---|---|
| `'all'`（デフォルト） | 「◀ 予定 | 実績 ▶」 2 カラム並列 | 確認用画面 `/reports/:date` |
| `'planned'` | 単一カラム（予定ブロックのみ） | 将来用履歴ビュー等 |
| `'actual'` | 単一カラム（実績ブロックのみ） | 将来用履歴ビュー等 |

### variant='all' レスポンシブブレークポイント

| 画面幅 | レイアウト |
|---|---|
| sm 以上 (≥640px) | 横並び 2 列: 時刻軸 40px + 予定 1fr + 1px セパレータ + 実績 1fr |
| sm 未満 (<640px) | 縦積み: 予定 → 実績の順に表示 |

> **BUG-A 履歴**: 中間対応 (b4ec6c8) では md ブレークポイント (768px) を利用していたが、主上御指摘により sm (640px) + Today と同一コンポーネント構成に統一（真の修正 94ed85b）。

---

## 改修履歴

- **2026-06-06 94ed85b**: BUG-A 真の修正 — `ReadOnlyTimeline` (確認用画面) を Today `TimelinePanel` と同一の 2 カラム並列レイアウトに統一。variant テーブルを STATUS_FLOW.md に追記
- **2026-06-04 db741db**: BUG-B 残存修正 — Today 画面の期限切れ/提出済み由来 TODO を完全読み取り専用化。`todoReadOnly.ts` 新規作成により OR 条件を一元管理。期限切れ (dueDate < today) の判定を UI 層・ store 層の両方に展開
- **2026-06-04 ae0ce12**: BUG-B [P0] submitted/confirmed 日報の TODO を UI 層で完全読み取り専用化 — チェックボックス disabled / ＋ボタン非表示 / 削除ボタン非描画 / 🔒 読み取り専用バッジ表示。store 層の既存ガード（commit 5170401）を二重防壁として温存
- **2026-06-04 90a69fe**: E-7 catch-all ルート + NotFoundPage 実装 — 未定義 URL で 404 ページを表示
- **2026-06-06 0450936**: E-8 真の原因修正 — `src/store/deletedCustomers.ts` 新規作成・削除顧客 ID を localStorage 永続化。store 初期化時に seed data からフィルタアウト。`e2e/e8-deletedCustomer.spec.ts` 3テスト追加
- **2026-06-06 e54993b**: P0/P1 本体実装 — 顧客削除フローに付帯情報判定 + localStorage 永続化フローを追加。ログインロック状態遷移を LoginPage.tsx に実装 (useState lazy init / ロックバナー / カウントダウン / ボタン disabled)。`e2e/customer-delete-role.spec.ts` 5テスト + `e2e/login-lockout.spec.ts` 4テスト追加
- **2026-06-04 139386b**: E-8 顧客削除後表示ルール — ReadOnlyTimeline/SidePanelCards/SearchPage で削除済み顧客を `'不明'` と表示（根本修正は e54993b/0450936）
- **2026-06-03 319e32c**: AUTH-1/AUTH-2 認証セッション・ガード実装 — ログイン認証・30分無操作失効・パスワード変更
- **2026-06-03 c059b47**: 鳳凰殿 UX ジャーニー改善 6件 を反映 (前後ナビ・上長リダイレクト・未確認フィルタ・前後日付・ヒートマップbutton化・氏名強調)
- **2026-06-03**: 上長コメント・お褒め記録機能追加対応、submitted フラグの関係を明記
- **2026-06-03 b623958**: in_progress 時の提出ヘッダーカード追加
- **2026-06-04 8ccb832**: 保安司 P0 — `customerAttachment.ts` ユーティリティと単体テスト新規作成（UI/Store への組み込みは e54993b で完成）
- **2026-06-06 3c16dbd**: submitted フラグ廃止を反映 — 「submitted フラグと status の関係」節を「status による提出状態管理」に書き換え。boolean フラグ列削除・status 一元判定を明記。差し戻し記述から `submitted=false` を削除。実装ファイル参照から `DailyReport.submitted` を削除
