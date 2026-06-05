# セキュリティ仕様

## 概要

nippou-app のセキュリティ要件と対策実装の記録。
保安司家臣による監査結果 (`audit/SECURITY_AUDIT_2026-06-04.md`) に基づき、P0/P1 脆弱性を修正。

---

## 実施済み対策

### P0: 顧客削除権限の付帯情報判定 (e54993b — 2026-06-06 本体実装, 8ccb832 はテストのみで実装欠落)

> **⚠ 訂正 (d8aae47 の汚染分)**: 前回 commit `d8aae47` の docs は `8ccb832`（テストのみ）を実装済みとして記録していたが、CustomersPage.tsx/store/index.ts の本体実装は欠落していた。真の実装は `e54993b` (2026-06-06) である。

#### 問題
付帯情報（日報ブロック・TODO）が紐付いている顧客でも、権限不足のロールが削除操作を実行できる状態にあった（`8ccb832` ではユーティリティとテストのみ追加され、UI/Store への組み込みが欠落）。

#### 対策

**UI 層: `src/pages/CustomersPage.tsx` (e54993b)**
- `import { canDeleteCustomer, hasCustomerAttachment } from '../utils/customerAttachment'` を追加
- `attachmentState = { reports }` を計算して各 IIFE に渡す
- 各顧客行の削除ボタン:
  - `canDeleteCustomer(attachmentState, customer.id, currentRole)` を per-行で評価
  - 削除不可の場合: `disabled` + `cursor-not-allowed` + `opacity-50` + `title` ツールチップ（「付帯情報あり: admin/executive のみ削除可」）
  - 削除可の場合: `text-red-700 border-red-300 hover:bg-red-50`
  - `aria-disabled` を付与（アクセシビリティ対応）
- 編集モーダル内「危険ゾーン」の削除ボタンも同様: `modalHasAttach` / `modalCanDelete` で個別判定

**ストア層: `src/store/index.ts` (`deleteCustomer`) (e54993b)**
- 付帯情報あり + `currentRole` が admin/executive 以外 → `console.warn('[security] deleteCustomer blocked: 付帯情報あり customer は admin/executive のみ削除可')` を出力して no-op で終了
- UI 層とストア層の **二層防御** により、不正な直接呼び出しも阻止

**判定ユーティリティ: `src/utils/customerAttachment.ts` (8ccb832 で新規作成)**
- `hasCustomerAttachment(state, customerId): boolean`
  - `reports[].blocks[].customerId` または `reports[].todos[].customerId` に一致すれば `true`
- `canDeleteCustomer(state, customerId, currentRole): boolean`
  - 未ログイン (currentRole=undefined): 常に `false`
  - 付帯情報なし: ログイン中の任意ロール → `true`
  - 付帯情報あり: `admin` / `executive` のみ → `true`、それ以外 → `false`

#### テスト
- `src/__tests__/customerAttachment.test.ts` — 14 テスト（`hasCustomerAttachment` 5件 + `canDeleteCustomer` 9件、8ccb832 で追加）
- `e2e/customer-delete-role.spec.ts` — 5 テスト (e54993b で追加、E2E レベルで権限制御を検証)

---

### P1: ログイン失敗回数の localStorage 永続化 (e54993b — 2026-06-06 本体実装, f2cd145 はテストのみで実装欠落)

> **⚠ 訂正 (d8aae47 の汚染分)**: 前回 commit `d8aae47` の docs は `f2cd145`（テストのみ）を実装済みとして記録していたが、LoginPage.tsx への localStorage 永続化・ロックバナー・カウントダウンの実装は欠落していた。真の実装は `e54993b` (2026-06-06) である。

#### 問題
ログイン失敗カウンタが `useState` のメモリのみで管理されていたため、ページリロードでリセットされ、ブルートフォース攻撃対策が無効化されていた（`f2cd145` ではユーティリティとテストのみ追加され、LoginPage.tsx への組み込みが欠落）。

#### 対策

**`src/pages/LoginPage.tsx` (e54993b)**

| タイミング | 処理 |
|---|---|
| マウント時 | `useState` 初期値で `parseInt(localStorage.getItem('nippou_login_fails') ?? '0', 10)` を読み込み。`Number.isNaN` なら `0` にフォールバック |
| マウント時 | `lockUntil` の初期値で `parseInt(localStorage.getItem('nippou_login_lock_until') ?? '0', 10)` を読み込み |
| ログイン失敗時 | `failCount + 1` を `localStorage.setItem('nippou_login_fails', ...)` に同期 |
| 5 回失敗時 | `Date.now() + 30 * 60 * 1000` を `lockUntil` state と `localStorage.setItem('nippou_login_lock_until', ...)` に保存 |
| ログイン成功時 | `setFailCount(0)` / `setLockUntil(0)` + `localStorage.removeItem` で両キーをクリア |

**ロック状態判定**:
```ts
const isLocked = failCount >= 5 || lockUntil > now;
// now は useEffect で毎秒更新（カウントダウン表示用）
```

**NaN ガード** (破損データ対策):
```ts
const v = parseInt(localStorage.getItem('nippou_login_fails') ?? '0', 10);
const failCount = Number.isNaN(v) ? 0 : v;
```

**ロックバナー (UI)**:
- `isLocked` 中は▼の赤バナーを表示 (`role="alert"`, `bg-red-50 border border-red-300`)
- ロック解除までの残り時間を分単位でカウントダウン表示 (`Math.ceil((lockUntil - now) / 60000) 分後にロック解除`)
- `useEffect` で `lockUntil > 0` の間、`setInterval(1000)` で `now` を毎秒更新

**ボタン制御**:
- `<button type="submit" disabled={loading || isLocked}>` — ロック中はボタン disabled
- ボタンラベル: `loading ? '認証中...' : isLocked ? 'ロック中' : 'ログイン'`
- `handleLogin` 冠頭で `if (isLocked) return;` ガード

#### localStorage キー
| キー | 値 | 用途 |
|---|---|---|
| `nippou_login_fails` | 数値文字列 | 連続失敗回数 (0〜) |
| `nippou_login_lock_until` | Unix ミリ秒文字列 | ロック解除時刻 (0 = ロックなし)。`Date.now() > lockUntil` で自動解除 |

#### テスト
- `src/__tests__/loginLockout.test.ts` — 13 テスト（初期値読み込み・NaN ガード・失敗時書き込み・成功時クリア・ロック状態判定）
- `e2e/login-lockout.spec.ts` — 4 テスト (e54993b で追加、E2E レベルでロック展開を検証)

---

### P1: Netlify デプロイスクリプトの Site ID を環境変数化 (0326621 — 2026-06-04)

#### 問題
`scripts/netlify-deploy.sh` に Netlify Site ID (GUID) がハードコードされており、リポジトリに機密情報が含まれていた。

#### 対策

**`scripts/netlify-deploy.sh`**
```sh
# 変更前
SITE_ID="53453b52-8d02-43b5-860b-0bee67040bc8"

# 変更後
SITE_ID="${NETLIFY_SITE_ID:-}"
if [ -z "$SITE_ID" ]; then
  echo "ERROR: NETLIFY_SITE_ID is not set" >&2
  echo "  Export it before running: export NETLIFY_SITE_ID=<your-site-id>" >&2
  exit 1
fi
```

- 未設定時は stderr にエラーメッセージを出力し `exit 1`
- CI/CD 環境では環境変数 `NETLIFY_SITE_ID` を設定して実行すること

---

### BUG-B 残存修正: TODO 編集の二層防御拡張 (db741db — 2026-06-04)

#### 問題
`ae0ce12` (BUG-B [P0]) で提出済み/承認済み日報由来の TODO 保護は実装済みだったが、**期限切れ TODO**（`dueDate < today`）が Today 画面から変更可能なまま残っていた。

#### 対策

**共通判定ユーティリティ: `src/utils/todoReadOnly.ts`**

TODO 読み取り専用判定を 1 ただ所に集約。UI 層・ store 層の両方で利用。

| 読み取り専用条件 | 詳細 |
|---|---|
| `reportStatus ∈ ['submitted', 'confirmed']` | 提出済み/承認済み日報由来の TODO |
| `todo.dueDate < today` | 期限切れ TODO (YYYY-MM-DD 文字列比較) |

**UI 層: `src/components/today/SidePanelCards.tsx`**
- 各 TODO 行で `isTodoReadOnly(todo, report.status, todayStr)` を呼び出し per-todo で判定
- `isBtnDisabled = isReadOnly || todoReadOnly` によりチェックボックス・削除ボタンを無効化

**store 層: `src/store/index.ts`**
- `toggleTodo` / `updateTodo` / `deleteTodo` 内のガードを `isTodoReadOnly` を使う形に更新
- status が `planning` / `in_progress` な TODO でも期限切れの場合は no-op
- `console.warn('[store] toggleTodo blocked: todo is read-only', { reportId, todoId, status, dueDate })` を出力しデバッグ容易化

#### 二層防御の構成

```
リクエスト
  └→ UI 層: isBtnDisabled=true → ボタン disabled (操作を防ぐ)
  └→ store 層: isTodoReadOnly → true なら no-op (万が一 UI を迭貧しても防ぐ)
```

#### テスト
- `src/__tests__/todoReadOnly.test.ts` — 23 テスト（`isTodoReadOnly` / `getTodoReadOnlyReason` 全エッジケース）
- `src/__tests__/todoCardReadOnly.test.tsx` — +4 テスト（overdue シナリオ: チェックボックス disabled / ハンドラ無効 / バッジ表示）

---

## セキュリティ原則

### 二層防御 (Defense in Depth)
権限制御は **UI 層** と **ストア層** の両方で実施する。UI バグや直接呼び出しによる迂回を防ぐ。

### ロール階層
| ロール | 顧客削除 (付帯情報あり) | 顧客削除 (付帯情報なし) |
|---|---|---|
| general | ✗ | ✓ |
| manager | ✗ | ✓ |
| executive | ✓ | ✓ |
| admin | ✓ | ✓ |

### 認証・セッション (AUTH-1〜5)
詳細は `docs/DATA_MODEL.md` の「認証・セッション」セクション、および `docs/UI_SPEC.md` の「App.tsx (認証ガード)」セクションを参照。

---

## 改修履歴

- **2026-06-06 0450936**: E-8 真の原因修正 — Zustand store 非永続化を根本修正。`src/store/deletedCustomers.ts` 新規作成・削除済み顧客 ID を localStorage 永続化、store 初期化時に seed data からフィルタアウト。`resetAll` 時に localStorage クリア
- **2026-06-06 e54993b**: P0/P1 本体実装 — CustomersPage.tsx に per-customer 削除権限制御 (canDeleteCustomer + hasCustomerAttachment 適用、disabled + title ツールチップ、編集モーダル危険ゾーンも同様)、LoginPage.tsx に localStorage 永続化・ロックバナー・カウントダウン・ボタン disabled を実装。store/index.ts deleteCustomer に二層防御追加。前回 d8aae47 の汚染 docs を訂正
- **2026-06-04 db741db**: BUG-B 残存修正 — TODO 編集の二層防御を期限切れ (dueDate < today) まで拡張。`src/utils/todoReadOnly.ts` を新規作成し UI 層・ store 層両方に展開
- **2026-06-04 8ccb832**: P0 — 顧客削除権限の付帯情報判定ユーティリティ (`customerAttachment.ts`) と単体テストを新規作成（UI/Store への組み込みは e54993b で完成）
- **2026-06-04 f2cd145**: P1 — ログインロックアウトのユーティリティとテストを新規作成（LoginPage.tsx への組み込みは e54993b で完成）
- **2026-06-04 0326621**: P1 — netlify-deploy.sh の Site ID をハードコードから環境変数に変更
- **2026-06-03 319e32c**: AUTH-1〜5 — ログイン認証・セッション失効・パスワード変更・認証ガードを実装
