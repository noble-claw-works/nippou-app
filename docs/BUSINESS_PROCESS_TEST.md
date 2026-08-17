# ビジネスプロセステスト (BUSINESS_PROCESS_TEST)

> **対象システム**: 305 nippou-app — 保険営業支援フルCRUDモック  
> **作成日**: 2026-08-17  
> **正本**: 実コード (`src/pages/`, `src/store/index.ts`, `src/types/index.ts`)  
> **注意**:
> - 本システムはモック環境（Zustand + localStorage seed）。APIバックエンドは存在しない。
> - 実在しない機能・画面は記載しない。
> - 各シナリオの「検証観点」は UI層とstore層（二層防御）の両方を対象とする。
> - 「関連UC」列は `docs/USE_CASE_LIST.md` のユースケースIDを参照する。

---

## テストシナリオ一覧

| テストID | タイトル | 対象ロール | 関連UC |
|---|---|---|---|
| BPT-01 | 営業の1日フロー | general | UC-G-01〜07 |
| BPT-02 | 日報レビューサイクル（提出→差し戻し→再提出→承認） | general + manager | UC-G-07, UC-M-02〜04 |
| BPT-03 | 商談ステージ進捗（9段階） | general | UC-G-04, UC-G-10 |
| BPT-04 | 契約発行フロー（受注→Policy生成→証券番号入力→inforce） | general | UC-G-12, UC-G-13 |
| BPT-05 | 保障漏れ発見→新規商談作成 | general | UC-G-14, UC-G-15 |
| BPT-06 | 世帯まとめ入力（HouseholdBatchEntry） | general | UC-G-16 |
| BPT-07 | 権限境界テスト（UI層+store層二層防御） | general / manager / executive | UC-G-18, UC-M-02〜04 |
| BPT-08 | 経営ダッシュボード閲覧 | executive | UC-E-01〜02 |
| BPT-09 | admin 運用（招待→無効化→監査ログ） | admin | UC-A-01〜06 |

---

## BPT-01: 営業の1日フロー

**関連UC**: UC-G-01, UC-G-02, UC-G-03, UC-G-04, UC-G-05, UC-G-06, UC-G-07

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 初期データ: seed済みの霧島遥ユーザー / 担当世帯が1件以上存在すること / 当日日報が未作成（またはstatus=planning/in_progress） |

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/today` を開く | 当日日報が自動生成される（createReport）。StatusStepperに「作成中」が表示される |
| 2 | 朝の気分アイコンを選択（例: ☀️ sunny） | `DailyReport.morningMood = 'sunny'` が保存される |
| 3 | 上長への合図を選択（例: 👍 ok） | `DailyReport.managerSignal = 'ok'` が保存される |
| 4 | 予定タイムラインにタイムブロックを追加（例: type=visit, 10:00-11:00, 世帯名を入力） | TimeBlock(isPlanned=true)が DailyReport.blocks に追加される |
| 5 | 実績タイムラインに実績ブロックを追加（コンボボックスで世帯を選択・メモ入力） | TimeBlock(isActual=true)が blocks に追加される。コンボボックスでお気に入り⭐や🕒アイコンが表示される |
| 6 | 実績ブロック追加時に「商談案件（任意）」欄から案件を選択し、ステージを変更する | stageHistoryに新エントリが追記される。Opportunity.stage が更新される |
| 7 | 右ペインでTODOを追加（テキスト・優先度を入力） | Todo が DailyReport.todos に追加される（status=todo） |
| 8 | 既存TODOをチェック | Todo.completed=true / status=done に更新される |
| 9 | 夕の気分を選択 | `DailyReport.eveningMood` が保存される |
| 10 | コメントセクションで「↑ 上長宛」コメントを入力・送信 | Comment がreports.comments に追加される |
| 11 | 「日報提出」ボタンをクリック | `DailyReport.status: in_progress → submitted`。`submittedAt` が記録される。通知(type=reminder)が発行される |

### 検証観点

- `DailyReport.status` の遷移がstoreで正しく保持されること（localStorage永続化）
- タイムブロックの追加後、blocks 配列に isPlanned/isActual が正しく区別されること
- コンボボックスでお気に入り（isFavorite=true）の世帯が上位に表示されること
- コンボボックスで `lastContactDate` が30日以内の世帯に🕒が表示されること
- 日報提出後は「提出」ボタンが非活性になること（二重提出防止）

---

## BPT-02: 日報レビューサイクル

**関連UC**: UC-G-07, UC-M-02, UC-M-03, UC-M-04

| 項目 | 内容 |
|---|---|
| 前提条件 | ユーザーA（general）がstatus=submitted の日報を持つこと / ユーザーB（manager）がユーザーAと同じチームに所属すること |

### 操作手順

| # | 操作 | 担当ロール | 期待結果 |
|---|---|---|---|
| 1 | ユーザーAの日報が submitted 状態であることを確認 | general | `DailyReport.status = 'submitted'` |
| 2 | managerでログインし `/report-admin` を開く | manager | SubmissionStatsTableに「提出済み」件数が表示される |
| 3 | `/reports/:date` でユーザーAの日報を開く | manager | 日報詳細が表示される。「差し戻す」「承認」ボタンが表示される |
| 4 | コメントセクションでフィードバックコメントを入力・送信 | manager | ManagerCommentが追加される（authorRole='manager'の青系アバター） |
| 5 | 「差し戻す」ボタンをクリック → 差し戻し理由を入力（必須）→「確定」 | manager | `DailyReport.status: submitted → in_progress`。Notification(type=sent_back)が発行される |
| 6 | generalでログインし `/notifications` を確認 | general | 差し戻し通知が表示される（isRead=false） |
| 7 | `/today` または `/reports/:date` で内容を修正して再提出 | general | `DailyReport.status: in_progress → submitted` |
| 8 | managerで再び `/reports/:date` を開き「承認」ボタンをクリック | manager | `DailyReport.status: submitted → confirmed`。`confirmedAt`・`confirmedBy` が記録される |
| 9 | Notification(type=confirmed)が発行されていることを確認 | general | /notifications に承認通知が表示される |

### 検証観点

- 差し戻し時に**理由の入力が必須**であること（空欄では確定できない）
- general は他人の日報に対して「差し戻す」「承認」ボタンが非表示であること（UI層ガード）
- `status=confirmed` になった日報は再度 `in_progress` に戻せないこと
- ManagerCommentの `authorRole` が正しく 'manager'/'executive'/'general' に設定されること
- `/report-admin` の一括承認（BulkConfirmPanel）でも同じ status 遷移が起こること

---

## BPT-03: 商談ステージ進捗（9段階）

**関連UC**: UC-G-04, UC-G-10

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当Opportunityが存在すること（stage=approach, status=open） |

### ステージ定義（実コード: `OpportunityStage` 型）

| ステージ値 | 表示名 | 説明 |
|---|---|---|
| `approach` | 🌱 アプローチ | 関係構築 |
| `fact_finding` | 🔍 ヒアリング | 家族構成・既契約棚卸 |
| `needs_analysis` | 📊 ニーズ分析 | |
| `proposal` | 📄 設計書提示 | |
| `negotiation` | 💬 検討中 | 質問対応 |
| `application` | ✍️ 申込書記入 | |
| `underwriting` | 🏥 引受査定中 | |
| `issued` | 🎉 証券発行 | won 状態 |
| `lost` | ❌ 失注 | |

### 操作手順（案件詳細からの変更）

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/opportunities` を開き、担当案件を選択して `/opportunities/:id` へ | OpportunityDetailPageが表示される。現ステージバッジが表示される |
| 2 | 「ステージ変更」ボタンをクリック → StageSelector が展開 | 9段階のステージ選択肢が表示される |
| 3 | `approach → fact_finding` に変更 | `Opportunity.stage = 'fact_finding'`。`stageHistory` に `{stage:'fact_finding', changedAt, changedByUserId}` が追記される |
| 4 | ステージをさらに `needs_analysis → proposal → negotiation` と順次進める | 各変更で `stageHistory` にエントリが蓄積される |
| 5 | `lost` に変更 → LostReason選択（例: `price`）が表示されることを確認 | `Opportunity.status = 'lost'`。`lostReason = 'price'` が保存される |

### 操作手順（日報内ステージ更新UX）

| # | 操作 | 期待結果 |
|---|---|---|
| 6 | `/today` で実績ブロック追加 → 世帯を選択 → 「商談案件（任意）」欄に担当Opportunityが表示される | コンボボックスに案件タイトルが表示される |
| 7 | 案件を選択 → 「→ ステージを変更する（現在: XX）」ボタンが展開 | 現在のステージが表示される |
| 8 | 新ステージを選択して「ステージを更新」 | Opportunity.stage が即時更新。stageHistoryに追記。localStorage に永続化 |

### 検証観点

- `stageHistory` の各エントリに `changedAt`（ISO形式）と `changedByUserId` が正しく記録されること
- `lost` 選択時に `LostReason` の入力UIが出現すること
- general は**自担当以外の Opportunity のステージを変更できない**こと（UI層）
- 日報内のステージ更新がブロック保存と同時に永続化されること

---

## BPT-04: 契約発行フロー

**関連UC**: UC-G-12, UC-G-13

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当Opportunityが存在すること（stage: application〜underwriting, status=open） / ProposalProductが1件以上存在すること |

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/opportunities/:id` を開く | OpportunityDetailPageが表示される |
| 2 | 「商品」タブで ProposalProduct の内容を確認（商品名・保険会社・被保険者・月払額） | 提案商品の一覧が表示される |
| 3 | 「🎉 契約発行（受注）」ボタンをクリック | QuickPolicyIssueModal が開く |
| 4 | モーダル内で提案商品の一覧を確認 | 各ProposalProductが表示される |
| 5 | 「発行する」ボタンをクリック | `issuePoliciesFromOpportunity()` が実行される。ProposalProduct から 1:1 で Policy が自動生成（status: pending） |
| 6 | Opportunity の状態変化を確認 | `Opportunity.stage = 'issued'`、`Opportunity.status = 'won'` に遷移 |
| 7 | `/policies` を開く | 新規生成されたPolicy（status: pending）が一覧に表示される |
| 8 | 該当Policy（status: pending）を開く（/policies/:id） | PolicyDetailPageが表示される。「証券番号を入力」ボタンが表示される |
| 9 | 「証券番号を入力」ダイアログで証券番号（例: "AB-12345678"）と契約開始日を入力し「有効化」をクリック | `activatePolicy(policyId, policyNumber, startDate, userId)` が実行される |
| 10 | Policy の状態変化を確認 | `Policy.status: pending → inforce`。`Policy.policyNumber` が保存される。`Policy.startDate` が設定される |
| 11 | PolicyStatusHistoryを確認 | 新エントリ `{status:'inforce', note:'証券番号: AB-12345678', changedByUserId}` が追記される |

### 検証観点

- ProposalProduct が 0 件の場合、「契約発行」ボタンが非活性または警告表示になること
- Policy の `sourceOpportunityId` が Opportunity.id と一致していること
- `activatePolicy` 後に Policy.policyNumber が設定されること（未入力では有効化できないこと）
- general は**自担当以外の Policy の有効化ができない**こと
- PolicyStatusHistoryに証券番号が note として記録されること

---

## BPT-05: 保障漏れ発見 → 新規商談作成

**関連UC**: UC-G-14, UC-G-15

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当世帯が存在し、Person（世帯主）に死亡保障の Policy が存在しないこと |

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/households/:id` を開く | HouseholdDetailPageが表示される |
| 2 | 「🛡️ 保障マトリクス」セクションを確認 | CoverageMatrix が表示される。行=Person、列=保障種別（death/medical_hospital/cancer/disability/nursing/savings）でマトリクスが表示される |
| 3 | 世帯主の「death（死亡）」列が `-`（保障なし）であることを確認 | そのセルに `-` が表示される |
| 4 | 赤警告バナーが自動表示されることを確認（世帯主に死亡保障がない場合） | 「世帯主に死亡保障がありません」等の赤警告バナーが表示される |
| 5 | `/opportunities` に移動し「+ 新規案件」ボタンをクリック → QuickOpportunityModal を開く | モーダルが表示される |
| 6 | 世帯を選択・タイトル（例: 「田中家 死亡保障」）・ステージ（approach）を入力して作成 | 新規 Opportunity が作成される（status=open, stage=approach） |
| 7 | 作成されたOpportunityが `/opportunities` 一覧に表示されることを確認 | 新規案件が一覧に追加される |

### 検証観点

- CoverageMatrix の `getCoverageMatrix(householdId)` が返す `coverageTypes` に `death` が含まれない Person のセルに `-` が表示されること
- 世帯主（headPersonId）の死亡保障がない場合にのみ赤警告バナーが出現すること
- 新規作成した Opportunity の `ownerId` がログインユーザーID と一致していること

---

## BPT-06: 世帯まとめ入力（HouseholdBatchEntry）

**関連UC**: UC-G-16

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当世帯が存在し、Personが2名以上登録されていること |

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/households/:id` を開く | HouseholdDetailPageが表示される |
| 2 | 「まとめ入力」ボタンをクリック → `/households/:id/batch-entry` に遷移 | HouseholdBatchEntryPageが表示される |
| 3 | 「+ 案件追加」ボタンで1件目の DraftOpportunity を追加 | 入力フォームが展開される（タイトル・ステージ・担当者・提案商品等） |
| 4 | 1件目: タイトル、ステージ（approach）、提案商品（productCategory, productName, insurer, monthlyPremium, insuredPersonId）を入力 | DraftOpportunity が入力状態になる。calcTotalMonthlyPremium() で合計月払が表示される |
| 5 | 「+ 案件追加」ボタンで2件目の DraftOpportunity を追加し入力 | 2件目が並列表示される |
| 6 | 各Draftの確度(ConfidenceUnified)・見込日付(ContractMilestones)・タスク(ContractTasks)を任意で入力 | 各フィールドに値が反映される |
| 7 | バリデーションエラーがある場合（タイトル未入力等）は countInvalidDrafts() > 0 の警告が出ることを確認 | 「N件の入力不備があります」等の警告が表示される |
| 8 | バリデーション通過後に「保存」ボタンをクリック | 全 DraftOpportunity が Opportunity として一括保存される |
| 9 | `/opportunities` で保存されたOpportunityが2件表示されることを確認 | 一覧に追加された案件が表示される |

### 検証観点

- `validateDraft()` が必須フィールド（タイトル等）の未入力を検出すること
- 「複製」（duplicateDraft）機能が既存 Draft のコピーを作成すること
- 保存後の Opportunity に `householdId` が正しく設定されていること
- `getMilestoneOrderWarnings()` でマイルストーン日付順序の矛盾が警告されること

---

## BPT-07: 権限境界テスト

**関連UC**: UC-G-18, UC-M-02, UC-M-03

| 項目 | 内容 |
|---|---|
| 前提条件 | 複数のロールでログインし直すこと / 付帯情報あり世帯（Opportunity/Policy等が紐づく世帯）が存在すること |

### テストケース一覧

| TC-ID | 操作 | ロール | 期待結果 | 防御層 |
|---|---|---|---|---|
| TC-07-01 | `/admin` に直接アクセス | `general` | ForbiddenState（「権限がありません」）が表示される | UI層（AdminPage内ロールガード） |
| TC-07-02 | `/admin` に直接アクセス | `manager` | ForbiddenState が表示される | UI層（AdminPage内ロールガード） |
| TC-07-03 | 他人の日報（/reports/:date）を開きコメント投稿を試みる | `general` | コメント入力フォームが非表示（または投稿ボタンが非活性）である | UI層（canComment=false） |
| TC-07-04 | 他人の日報に「差し戻す」ボタンが表示されないことを確認 | `general` | 「差し戻す」ボタンが非表示である | UI層 |
| TC-07-05 | 付帯情報あり世帯（🔗バッジ）の「削除」ボタンをクリック | `general` | 削除が実行されない（エラーまたは非活性） | UI層+store層（hasCustomerAttachment()） |
| TC-07-06 | 付帯情報あり世帯（🔗バッジ）の「削除」ボタンをクリック | `manager` | 削除が実行されない（エラーまたは非活性） | UI層+store層 |
| TC-07-07 | 付帯情報あり世帯（🔗バッジ）の「削除」ボタンをクリック | `executive` | 削除が実行される | UI層（executiveは許可） |
| TC-07-08 | `/dashboard` のチームタブに遷移 | `general` | ForbiddenState が表示される | UI層（TeamDashboardPage内ロールガード） |
| TC-07-09 | `/templates` に直接アクセス | `general` | ページが表示されない（NAV非表示）または Forbidden | UI層（AppShell NAV_ITEMS: admin のみ） |
| TC-07-10 | 他担当者の Opportunity のステージを変更しようとする | `general` | 編集ボタンが非表示または変更が保存されない | UI層 |
| TC-07-11 | 他担当者の Policy（status=pending）を有効化しようとする | `general` | 「証券番号を入力」ボタンが非表示または操作不可 | UI層 |
| TC-07-12 | セッション30分無操作後に操作する | `any` | 「セッションが切れました。再度ログインしてください」Toastが表示されログアウト | SessionWatcher（src/App.tsx） |

### 検証観点

- **UI層防御**: 画面コンポーネント内でのロールガード（currentRoleによるForbiddenState表示・ボタン非表示）
- **Store層防御**: `deleteCustomer()`, `hasCustomerAttachment()` 等のstore操作内でのロールチェック
- **二層防御の確認**: UI層を迂回してstore関数を直接呼び出した場合も制限されることを確認する（実際にはモックのためブラウザコンソールからZustandストアを操作して検証可能）
- **NAV_ITEMSの役割別フィルタ**: AppShellの `roles` 配列にロールが含まれない項目はナビゲーションに表示されないこと

---

## BPT-08: 経営ダッシュボード閲覧

**関連UC**: UC-E-01, UC-E-02

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `executive` / 複数ユーザー・チームのデータが seed されていること / inforce/pending/lapsedの Policy が複数件存在すること |

> **注意**: `/dashboard`(SalesDashboardPage) の現行実装は AchievementCardRow / TargetProgressCard / SalesFunnelPanel / RecentPoliciesPanel の4パネル構成。旧USER_GUIDEが記載していた「契約ステータス分布グラフ」「保険会社別契約数」は現行 `/dashboard` には存在しない。保険会社・種目別の分布は `/sales-perf` S5(S5InsurerType) で確認する。

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/dashboard` を開く（個人タブがデフォルト） | SalesDashboardPage が表示される。「個人」「チーム」タブ切替が表示される |
| 2 | PeriodSwitcher で「月次」「四半期」「年間」を切り替える | 表示期間が変わり、各パネルの数値が再計算される |
| 3 | PersonSelector（あれば）で任意のユーザーを選択 | 選択ユーザーの実績データが表示される（executiveは全ユーザー選択可） |
| 4 | AchievementCardRow でKPI（成約件数・保険料額・目標達成率等）を確認 | カード内に数値が表示される |
| 5 | SalesFunnelPanel でステージ別の商談数を確認 | 9段階のファネルが表示される（approach→…→issued/lost） |
| 6 | RecentPoliciesPanel で最近の成約契約を確認 | 直近のPolicy（inforce）が一覧表示される |
| 7 | 「チーム」タブをクリック → TeamDashboardPage | TeamSummaryCard・MemberRankingTable・UnderTargetAlertが表示される |
| 8 | `/opportunities` を開く | 全担当者・全ステージの Opportunity が全社分表示される |
| 9 | ステージフィルターで「underwriting（引受査定中）」を選択 | 該当案件のみ絞り込まれる |
| 10 | `/admin` を開く | AdminPageが表示される。黄色バナー「経営者ロールでは閲覧のみ可能です」が表示される |
| 11 | /admin → 監査ログタブを確認 | AuditLogが操作時刻降順で一覧表示される |
| 12 | /admin でユーザー招待・チーム編集・削除ボタンの有無を確認 | これらのボタンは表示されない（canEdit=false） |

### 検証観点

- executiveは全ユーザーの Opportunity が閲覧できること（ロールフィルタ）
- `/admin` でcanEdit=false のとき、UsersTab・TeamsTabの編集・招待・削除ボタンが非表示であること
- TargetEditModal（目標設定）は executive ロールでも利用可能であること（canEditTarget=true）
- TeamDashboardPage で executive は全チームを選択可（manager は自チームのみ）

---

## BPT-09: admin 運用（招待→無効化→監査ログ確認）

**関連UC**: UC-A-01, UC-A-02, UC-A-03, UC-A-04, UC-A-05, UC-A-06

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `admin` / 既存ユーザーが1名以上、チームが1つ以上存在すること |

### 操作手順

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/admin` → 👥 ユーザータブを開く | ユーザー一覧が表示される（status別バッジ: active/inactive/invited） |
| 2 | 「招待」ボタンをクリック → 氏名・メールアドレス・ロール（general）・チームを入力し「招待」 | 新規 User が追加される（status: invited）。AuditLogに招待操作が記録される |
| 3 | 招待したユーザーでログイン（ロールに応じた画面へ遷移） | generalとしてログイン → /today にリダイレクトされる |
| 4 | adminに戻り、作成したユーザーの「編集」ボタンをクリック → ロールを「manager」に変更して保存 | User.role = 'manager' に更新される。AuditLogにロール変更が記録される（diff に before/after が含まれる） |
| 5 | 🏢 チームタブを開く → 既存チームの「編集」ボタンをクリック | チーム編集モーダルが表示される（メンバー追加・上長指定のチェックボックスが表示される） |
| 6 | メンバーを追加・上長を変更して保存 | Team.memberIds・Team.managerIds が更新される。AuditLogに変更が記録される |
| 7 | 「無効化」ボタンでステップ2で作成したユーザーを無効化 | `User.status: active → inactive`。そのユーザーはログインできなくなる |
| 8 | 📜 監査ログタブを開く | AuditLog一覧が操作時刻降順で表示される（招待/ロール変更/チーム編集/無効化の各操作が記録されている） |
| 9 | 各ログエントリで result（success/failure）・IP・操作内容を確認 | `result: 'success'` のエントリが各操作分だけ存在する |

### 検証観点

- `/admin` への直接アクセスは admin/executive のみ許可されること
- 招待操作で AuditLog.targetType='User', AuditLog.action が適切な文字列で記録されること
- ユーザー無効化後、該当ユーザーでのログインが拒否されること（loginアクションのエラー返却）
- チーム削除時は確認ダイアログ+名前入力の二重確認が必要であること
- 監査ログで `diff` フィールドに `{before, after}` の形式で変更前後が記録されること

---

## 付記: テスト実施上の注意

### データ初期化

- テスト実施前に `localStorage.clear()` または ブラウザのストレージリセットを行い、seedデータの初期状態から開始することを推奨
- 各BPTは独立したシナリオとして実施可能だが、BPT-02はBPT-01の完了を前提とする（submitted状態の日報が必要）
- BPT-04はBPT-03の続きとして実施するか、ProposalProductを事前に作成しておくこと

### デモ/開発用機能

- ロール切替: SettingsPageまたはログイン画面のユーザー選択からロールを切り替えてテスト可能（E-9仕様）
- デフォルトパスワード: 全ユーザー共通 `demo`（`DEFAULT_DEMO_PASSWORD`）

### 未検証項目

- `/sales-perf`（SalesPerfPage S1〜S7）の各サブ画面の詳細データ検証: [要確認]
- TrackingSession（追跡セッション）を使った時間追跡のフロー: [要確認]
- お褒め記録（Compliment）の追加・週次まとめの詳細UI: [要確認]

---

*本ドキュメントは実コードを正本として作成。「[要確認]」は実装確認が取れていない箇所を示す。*
