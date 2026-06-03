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

## 提出フロー

### submitted フラグと status の関係

| 操作 | status 遷移 | submitted 変化 | submittedAt |
|---|---|---|---|
| `confirmPlanning()` | `planning` → `in_progress` | — | — |
| `submitReport()` | `in_progress` → `submitted` | `false` → `true` | セット（現在時刻） |
| `withdrawReport()` | `submitted` → `in_progress` | `true` → `false` | クリア |
| `confirmReport()` | `submitted` → `confirmed` | 変化なし（true 維持） | 変化なし |
| `bulkConfirmReports(reportIds[])` | 複数ε`submitted` → `confirmed` | 変化なし（true 維持） | 変化なし |

**一括確認の実装** (MGR-4):
- Store action `bulkConfirmReports(reportIds: string[]): number`
- 入力: status='submitted' の日報 ID 配列
- 処理: 各 ID に対し `confirmReport()` を内体的に実行
- 戻り値: 実際に confirmed 状態にさせた件数（丢要値は不追加）

**重要**: `submitted` フラグと `status='submitted'` は常に同期している。
実装の都合上、いずれかで「提出済みか」を判定できる。

## 差し戻しの扱い

上長による差し戻しは「取り下げ」と同動作（`submitted → in_progress` + `submitted=false`）。
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

- `src/types/index.ts` — `ReportStatus` / `DailyReport.submitted` 型定義
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
| ReportDetailPage | general | 自分の日報のみ前後ナビ |
| ReportDetailPage | manager/executive | 範囲内各日報の前後ナビ + 未確認循環ナビ |
| DashboardPage | (all) | 上長以上のみアクセス可能 |

**上長ビューの未確認循環ナビ**:
- 初料粗い結果一覧 (status='submitted' のみ) を出力。unconfirmedReports を数える
- 現在インデックスを基礎に前/次を決定し、循環可能 (一覧を貴すよう会綬の下)

---

## 改修履歴

- **2026-06-03 319e32c**: AUTH-1/AUTH-2 認証セッション・ガード実装 — ログイン認証・30分無操作失効・パスワード変更
- **2026-06-03 c059b47**: 鳳凰殿 UX ジャーニー改善 6件 を反映 (前後ナビ・上長リダイレクト・未確認フィルタ・前後日付・ヒートマップbutton化・氏名強調)
- **2026-06-03**: 上長コメント・お褒め記録機能追加対応、submitted フラグの関係を明記
- **2026-06-03 b623958**: in_progress 時の提出ヘッダーカード追加
