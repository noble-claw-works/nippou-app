# セキュリティ仕様

## 概要

nippou-app のセキュリティ要件と対策実装の記録。
保安司家臣による監査結果 (`audit/SECURITY_AUDIT_2026-06-04.md`) に基づき、P0/P1 脆弱性を修正。

---

## 実施済み対策

### P0: 顧客削除権限の付帯情報判定 (8ccb832 — 2026-06-04)

#### 問題
付帯情報（日報ブロック・TODO）が紐付いている顧客でも、権限不足のロールが削除操作を実行できる状態にあった。

#### 対策

**UI 層: `CustomersPage.tsx`**
- 各顧客行で `canDeleteCustomer(state, customerId, currentRole)` を計算
- 削除不可の場合: 削除ボタンを `disabled` 状態にし、ホバーでツールチップを表示
- 編集モーダル内「危険ゾーン」の削除ボタンも同様に制御

**ストア層: `store/index.ts` (`deleteCustomer`)**
- 付帯情報あり + `currentRole` が admin/executive 以外の場合 → `console.warn` を出力して no-op で終了
- UI 層とストア層の **二層防御** により、不正な直接呼び出しも阻止

**判定ユーティリティ: `src/utils/customerAttachment.ts`**
- `hasCustomerAttachment(state, customerId): boolean`
  - `reports[].blocks[].customerId` または `reports[].todos[].customerId` に一致すれば `true`
- `canDeleteCustomer(state, customerId, currentRole): boolean`
  - 未ログイン (currentRole=undefined): 常に `false`
  - 付帯情報なし: ログイン中の任意ロール → `true`
  - 付帯情報あり: `admin` / `executive` のみ → `true`、それ以外 → `false`

#### テスト
`src/__tests__/customerAttachment.test.ts` — 14 テスト（`hasCustomerAttachment` 5件 + `canDeleteCustomer` 9件）

---

### P1: ログイン失敗回数の localStorage 永続化 (f2cd145 — 2026-06-04)

#### 問題
ログイン失敗カウンタが `useState` のメモリのみで管理されていたため、ページリロードでリセットされ、ブルートフォース攻撃対策が無効化されていた。

#### 対策

**`src/pages/LoginPage.tsx`**

| タイミング | 処理 |
|---|---|
| マウント時 | `localStorage.getItem('nippou_login_fails')` を読み込み、`parseInt` で数値化。NaN の場合は `0` にフォールバック |
| ログイン失敗時 | `failCount + 1` を `localStorage.setItem('nippou_login_fails', ...)` に同期 |
| 5 回失敗時 | `Date.now() + 30 * 60 * 1000` を `localStorage.setItem('nippou_login_lock_until', ...)` に保存 |
| ログイン成功時 | `localStorage.removeItem` で両キーをクリア |

**ロック状態判定**:
```ts
const isLocked = lockUntil > Date.now() || failCount >= 5;
```

**NaN ガード** (破損データ対策):
```ts
const raw = localStorage.getItem('nippou_login_fails') ?? '0';
const parsed = parseInt(raw, 10);
const failCount = isNaN(parsed) ? 0 : parsed;
```

#### localStorage キー
| キー | 値 | 用途 |
|---|---|---|
| `nippou_login_fails` | 数値文字列 | 連続失敗回数 (0〜) |
| `nippou_login_lock_until` | Unix ミリ秒文字列 | ロック解除時刻 (0 = ロックなし) |

#### テスト
`src/__tests__/loginLockout.test.ts` — 13 テスト（初期値読み込み・NaN ガード・失敗時書き込み・成功時クリア・ロック状態判定）

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

- **2026-06-04 db741db**: BUG-B 残存修正 — TODO 編集の二層防御を期限切れ (dueDate < today) まで拡張。`src/utils/todoReadOnly.ts` を新規作成し UI 層・ store 層両方に展開
- **2026-06-04 8ccb832**: P0 — 顧客削除権限に付帯情報判定を導入、二層防御を実装
- **2026-06-04 f2cd145**: P1 — ログインロックアウトを localStorage で永続化、NaN ガード追加
- **2026-06-04 0326621**: P1 — netlify-deploy.sh の Site ID をハードコードから環境変数に変更
- **2026-06-03 319e32c**: AUTH-1〜5 — ログイン認証・セッション失効・パスワード変更・認証ガードを実装
