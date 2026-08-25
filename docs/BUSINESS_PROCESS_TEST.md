# ビジネスプロセステスト (BUSINESS_PROCESS_TEST)

> **対象システム**: 305 nippou-app — 保険営業支援フルCRUDモック  
> **作成日**: 2026-08-17  
> **正本**: 実コード (`src/pages/`, `src/store/index.ts`, `src/types/index.ts`)  
> **注意**:
> - 本システムはモック環境（Zustand + localStorage seed）。APIバックエンドは存在しない。
> - 実在しない機能・画面は記載しない。
> - 各シナリオの「検証観点」は UI層とstore層（二層防御）の両方を対象とする。
> - 「関連UC」列は `docs/USE_CASE_LIST.md` のユースケースIDを参照する。
> **更新**: 2026-08-25（日堃3点BPT-14/15/16 ・タスク初期値マスタBPT を反映）

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
| BPT-10 | 契約ライフサイクル（受注後のステータス遷移） | general / manager | UC-G-13 |
| BPT-11 | 商談活動報告 → 日報連携 | general | UC-G-17 |
| BPT-12 | 付帯タスク管理（案件・被保険者単位） + 提案ラウンド | general | UC-G-11 |
| BPT-13 | 商談ステータスの分岐（partial_won / on_hold） | general / manager | — |
| BPT-14 | **過去日報ブロック詳細**(日堃3点D1・2026-08-25) | general | UC-G-24 |
| BPT-15 | **日付ナビ統一** 配沙(日堃3点D2・2026-08-25) | general | UC-G-25 |
| BPT-16 | **日報一覧検索・提出状冶**(日堃3点D3・2026-08-25) | general / manager / executive / admin | UC-G-23, UC-M-12 |
| BPT-17 | **タスク初期値マスタ管理**(タスク初期値マスタ・2026-08-25) | admin | ADR-TASK-MASTER |
| BPT-18 | **ダッシュボード全幅化**(営業実績タブ統合・2026-08-25) | general / manager / executive | IA-1, IA-5 |

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

## BPT-10: 契約ライフサイクル（受注後のステータス遷移）

**関連UC**: UC-G-13

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general`（または `manager`） / 該当 Policy が `status=inforce`（有効中）で存在すること / 担当者(ownerId)と currentUserId が一致するか、admin ロールであること |

### PolicyStatus 遷移マップ（実コード `PolicyStatus` 型 / `changePolicyStatus` アクション準拠）

| 遷移 | 操作ボタン（UI） | store アクション | 備考 |
|---|---|---|---|
| `inforce` → `paid_up` | 「💰 払済に変更」 | `changePolicyStatus(id, 'paid_up', note, userId)` | 保険会社への支払い停止・保障継続 |
| `inforce` → `surrendered` | 「❌ 解約処理」 | `changePolicyStatus(id, 'surrendered', note, userId)` | 解約返戻金が発生するケース |
| `inforce` → `matured` | 「🎉 満期処理」 | `changePolicyStatus(id, 'matured', note, userId)` | 満期日到来・保険期間終了 |
| `inforce` → `lapsed` | UI ボタン未実装 [要確認] | `changePolicyStatus(id, 'lapsed', note, userId)` | 保険料未払いによる失効（store から直接呼出可） |
| `inforce` → `reduced` | UI ボタン未実装 [要確認] | `changePolicyStatus(id, 'reduced', note, userId)` | 減額変更（store から直接呼出可） |

### 操作手順（inforce → surrendered を例示）

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/policies` を開き、`status=inforce` の契約を選択して `/policies/:id` へ | PolicyDetailPage が表示される。ステータスバッジに「有効中」が表示される |
| 2 | 「情報」タブ内のアクションボタン群を確認 | `canEdit=true`（自担当または admin）の場合のみ「💰 払済に変更」「❌ 解約処理」「🎉 満期処理」ボタンが表示される |
| 3 | 「❌ 解約処理」ボタンをクリック → prompt ダイアログでメモを入力（省略可）→「OK」 | `changePolicyStatus(policyId, 'surrendered', note, currentUserId)` が実行される |
| 4 | Policy のステータス変化を確認 | `Policy.status: inforce → surrendered`。ページのバッジが「解約」に更新される |
| 5 | 「履歴」タブを開く | PolicyStatusHistory に新エントリが追加される。`status='surrendered'`、`changedAt`（ISO）、`changedByUserId`、`note`（入力したメモ）が記録されている |
| 6 | 同じ手順で `paid_up`（払済）に変更したケースを確認 | ステップ 3〜5 と同様。ステータスバッジが「払済」に変わり、履歴に `status='paid_up'` が追加される |
| 7 | 同じ手順で `matured`（満期）に変更したケースを確認 | ステータスバッジが「満期」。履歴に `status='matured'` が追加される |

### 操作手順（権限テスト）

| # | 操作 | ロール | 期待結果 |
|---|---|---|---|
| 8 | 他担当者の Policy（inforce）の `/policies/:id` を開く | `general`（非担当） | `canEdit = policy.ownerId === currentUserId` → false。アクションボタンが非表示になる（UI 層ガード） |
| 9 | 同じ Policy を admin ロールで開く | `admin` | `canEdit = currentRole === 'admin' \| policy.ownerId === currentUserId` → true。アクションボタンが表示される |
| 10 | manager ロールで他担当者 Policy を開く | `manager` | `canEdit = false`（コード上 admin または ownerId 一致のみ）。アクションボタン非表示 [要確認: manager が他担当 Policy のステータス変更を行う UI 導線は現行未実装] |

### 検証観点

- `changePolicyStatus` 実行後、`Policy.status` が即座に新ステータスに更新され localStorage に永続化（`nippou.policies.v1`）されること
- PolicyStatusHistory に `{id, policyId, status, changedAt, changedByUserId, note}` の形式でエントリが追加されること（`nippou.policyHistory.v1` にも永続化）
- `note` が空文字の場合は `undefined` が記録されること（`note || undefined` 変換による）
- `canEdit = currentRole === 'admin' || policy.ownerId === currentUserId` の二値評価により、非担当 general ユーザーにはアクションボタンが非表示になること
- `lapsed`（失効）・`reduced`（減額）への遷移は store の `changePolicyStatus` は対応しているが、PolicyDetailPage の UI ボタンは実装がない。2026-08-17時点で inforce 状態からは paid_up / surrendered / matured の 3 選択のみ対応されている

---

## BPT-11: 商談活動報告 → 日報連携

**関連UC**: UC-G-17

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当 Opportunity（任意ステージ、status=open）が存在すること / 当日の DailyReport は存在していてもしなくてもよい |

### 操作手順（活動報告作成）

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/opportunities/:id/report` を開く | OpportunityReportPage が表示される。報告日（`reportDate`）の初期値は当日日付。同日結果がすでにあれば既存値がプリフィルされる |
| 2 | 報告日を入力（省略可: 当日がデフォルト） | `reportDate` に YYYY-MM-DD が設定される |
| 3 | 活動タイプを選択（訪問/電話/オンライン/その他） | `activityType: 'visit' | 'phone' | 'web' | 'other'` が設定される |
| 4 | 活動サマリ（必須）を入力 | `summary` が設定される。空欄では保存ボタンを押すと「活動サマリを入力してください」エラーとなる |
| 5 | 提案内容・次アクション・次回アポ日を任意入力 | `proposalDetail`, `nextAction`, `nextActionDate` が設定される |
| 6 | 確度ラダー（S/A/B/C/D/fixed）を選択 | `confidence` が設定される。また Opportunity.confidence にも反映される |
| 7 | 「保存」ボタンをクリック | `addOppActivityReport` または `updateOppActivityReport`（同日・同案件・同ユーザーの既存報告があれば更新）が実行される |
| 8 | 保存後、`syncOppReportToNippou(reportId)` が自動実行されることを確認 | 報告日の DailyReport（なければ自動作成）に TimeBlock（isActual=true）が自動追加される |
| 9 | `/today`（または報告日の `/reports/:date`）を開く | 報告から生成された実績ブロックが履歴に表示される。タイトルは `「{Opportunity.title}: {summaryの先頤40文字}」` |

### 操作手順（二重生成防止検証）

| # | 操作 | 期待結果 |
|---|---|---|
| 10 | 同日同案件の報告ページを再度開き、内容を修正して「保存」 | 既存報告が `updateOppActivityReport` で更新される。「新規追加」ではなく「更新」となる |
| 11 | `/today` の実績タイムラインを確認 | 同じ `sourceReportId` を持つブロックが 1 件のみ存在する（二重追加されていない） |

### 検証観点

- `activityType` と DailyReport TimeBlock.type のマッピング: `visit→visit`、`phone→phone`、`web→meeting`、`other→meeting`
- TimeBlock に `sourceReportId = reportId`、`isActual = true`、`opportunityId` が設定されること
- 当日日報が未作成の場合、`syncOppReportToNippou` 内部で `createReport` が自動呼び出され記録が先に作成されること
- `reachedMilestones`（firstConsult/lifePlan/proposal/contract/established）をチェックした場合、对応する Opportunity.milestones の日付が未設定であれば自動に `reportDate` がセットされること（既に設定済みの場合は上書きしない）
- `confidence` 選択時、`syncOppReportToNippou` 内で Opportunity.confidence も同時更新されること
- 活動報告は localStorage `nippou.oppActivityReports.v1` に永続化されること

---

## BPT-12: 付帯タスク管理（案件・被保険者単位）+ 提案ラウンド

**関連UC**: UC-G-11

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general` / 担当 Opportunity（status=open）が存在すること / ProposalProduct（提案商品）が 1 件以上登録済み / Opportunity.targetPersonIds に被保険者（Person）が登録されていること |

### BPT-12a: 案件共通タスク（ContractTasks）

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/opportunities/:id` を開き、「☑️ タスク」タブをクリック | タスク管理画面が表示される。タブラベルに 「☑️ タスク (done/total)」 が表示される |
| 2 | 「案件共通タスク」セクションで「証券回収」のチェックボックスをクリック | `updateContractTasks(id, { policyCollected: true, policyCollectDate: today })` が呼び出される。チェックが done 表示に切り替わる |
| 3 | タブの done/total カウントを確認 | done 数が +1 増えている。タブラベル表示も `1/N` 形式で更新される |
| 4 | 「証券回収」を再度クリック（未完了に戻す） | `policyCollected: false` に戻る。done 数が -1 される |
| 5 | 「ポリシーレビュー」のチェックボックスをクリック | `updateContractTasks(id, { policyReviewed: true, policyReviewDate: today })` が呼び出される |
| 6 | ページリロード後、チェック状態が保持されていることを確認 | localStorage `nippou.opportunities.v1` に永続化されているため、リロード後もチェック状態が復元される |

### BPT-12b: 被保険者単位タスク（InsuredTaskState）

| # | 操作 | 期待結果 |
|---|---|---|
| 7 | 「被保険者単位タスク」セクションで被保険者の山（A山 Aさん等）の「意向シート」チェックボックスをクリック | `updateInsuredTask(id, personId, { intentSheetDone: true, intentSheetDate: today })` が呼び出される |
| 8 | 同じ被保険者の「署名」チェックボックスをクリック | `updateInsuredTask(id, personId, { signatureDone: true, signatureDate: today })` が呼び出される |
| 9 | 他の被保険者の意向シート・署名も順次チェック | 被保険者ごとに独立した `InsuredTaskState` が保持されている。別被保険者のチェックが別の被保険者の状態に影響しない |
| 10 | done/total カウントを確認 | タスクタブの (done/total) に被保険者単位タスクの完了分も加算される |
| 11 | ページリロード後、被保険者タスクの状態が保持されていることを確認 | localStorage 永続化済みのためリロード後も状態保持 |

### BPT-12c: 提案ラウンド（ProposalRound）

| # | 操作 | 期待結果 |
|---|---|---|
| 12 | 「📝 提案履歴」タブをクリック | タブラベルに「📝 提案履歴 (N)」が表示される。ラウンド一覧（初期状態は 0 件）が表示される |
| 13 | 「第1回 提案ラウンドを追加」ボタンをクリック → 提案日を入力して保存 | `addProposalRound(id, { proposalDate, productIds })` が呼び出される。`roundNo=1` で新ラウンドが作成される |
| 14 | 一覧に第 1 回提案が表示されることを確認 | `round.roundNo=1`、`round.proposalDate`、商品構成スナップショット（productIds）が表示される |
| 15 | 再度「第2回 提案ラウンドを追加」ボタンをクリック → 別の提案日を入力して保存 | `roundNo=2` で第 2 回一覧に追加される（自動連番または更新後再採番） |
| 16 | 第 1 回ラウンドの「削除」ボタンをクリック | `deleteProposalRound(id, roundId)` が呼び出される。履歴から該当ラウンドが削除され、次のラウンドの `roundNo` が再採番（1, 2, ...）される |
| 17 | 一覧で各ラウンドの番号が連番で表示されることを確認 | 削除後の残りラウンドの roundNo が 1 からの連番に正しく再採番されている |

### 検証観点

- **案件共通タスク**: `updateContractTasks` 実行後、Opportunity.contractTasks に `policyCollected/policyReviewed`（boolean）および対応日付（設定時: `YYYY-MM-DD`）が保存されること
- **被保険者単位タスク**: `updateInsuredTask` 実行後、Opportunity.insuredTasks 配列の該当 personId エントリに `intentSheetDone/signatureDone`（boolean）が正しく保存されること（新規の場合は配列に追加）
- `getOppTaskRows` が返す `taskRows` の done 属性合計と `doneTaskCount` を done/total 表示が一致すること
- **提案ラウンドの roundNo 連番**: `addProposalRound` 実装上 `roundNo = existing.length + 1`、`deleteProposalRound` 実装上削除後に `rounds.map((r, i) => ({ ...r, roundNo: i + 1 }))` で再採番されること
- **productIds スナップショット**: 提案ラウンド作成時に選択した ProposalProduct.id 群が `productIds` 配列として当該回のラウンド内に保存されること（後から ProposalProduct を削除しても当時の構成を参照可能）
- 全ティックの変更は localStorage `nippou.opportunities.v1` に即座永続化されること

---

## BPT-13: 商談ステータスの分岐（partial_won 一部成立 / on_hold 保留）

**関連UC**: —

| 項目 | 内容 |
|---|---|
| 前提条件 | ログインロール: `general`（または `manager`） / 担当 Opportunity（status=open）が存在すること / ProposalProduct が 2 件以上登録されていること（partial_won 検証の場合） |

### OpportunityStatus 一覧（実コード `OpportunityStatus` 型）

| status 値 | 意味 | UI 導線 | 遷移方法 |
|---|---|---|---|
| `open` | 商談中 | 初期値（新規作成時） | 初期値 |
| `won` | 成約（全件） | `issuePoliciesFromOpportunity` 実行時、または `changeOpportunityStage('issued')` 実行時に自動遷移 | store 自動遷移 |
| `partial_won` | 一部成立 | **UI 導線未実装** — `updateOpportunity(id, { status: 'partial_won' })` で store から直接セット可能 | store 直接 |
| `lost` | 失注 | `changeOpportunityStage('lost')` 実行時に自動遷移 | store 自動遷移 |
| `on_hold` | 保留 | **UI 導線未実装** — `updateOpportunity(id, { status: 'on_hold' })` で store から直接セット可能 | store 直接 |

> **実装確認注**: `partial_won` および `on_hold` には OpportunityDetailPage および OpportunitiesPage 上に専用 UI ボタンの実装はない（src 内 grep 確認済み）。 `issuePoliciesFromOpportunity` は全 ProposalProduct を一括発行し `status='won'` に遷移する（一部のみ発行するロジックは実装なし）。 `partial_won` 遷移を引き起こす UI 導線は **[要確認: UI 導線未実装]** 。

### 操作手順（won / lost の自動遷移検証）

| # | 操作 | 期待結果 |
|---|---|---|
| 1 | `/opportunities/:id` を開き、ステージを `issued` に変更 | `changeOpportunityStage(id, 'issued')` 実行。`Opportunity.status: open → 'won'`、`actualCloseDate` が設定される。stageHistory に `stage='issued'` が追加される |
| 2 | `/opportunities/:id` を開き、ステージを `lost` に変更 | `changeOpportunityStage(id, 'lost')` 実行。`Opportunity.status: open → 'lost'`。LostReason 選択 UI が出現すること |
| 3 | `issuePoliciesFromOpportunity` 実行後のステータスを確認 | Opportunity.status `won`、Opportunity.stage `issued`。生成 Policy に `sourceOpportunityId = Opportunity.id` が入っていること |

### 操作手順（on_hold の store 直接遷移 — デモ検証）

| # | 操作 | 期待結果 |
|---|---|---|
| 4 | ブラウザコンソールから Zustand store を参照し、`updateOpportunity(id, { status: 'on_hold' })` を実行 | Opportunity.status が `on_hold` に更新され localStorage に永続化される |
| 5 | `/opportunities` 一覧を確認 | status `on_hold` の案件が一覧に表示されること（待機中の件として検証できる） |
| 6 | 同様に `updateOpportunity(id, { status: 'partial_won' })` を実行 | Opportunity.status が `partial_won` に更新される |

### 検証観点

- **`won`・`lost` は store 自動遷移** (`changeOpportunityStage`・`issuePoliciesFromOpportunity` 実行時)。`partial_won`・`on_hold` の UI 導線は **未実装**: `updateOpportunity` store API からの直接セットのみ確認可能
- `changeOpportunityStage` のコード上、`newStage === 'issued'` 時のみ `status='won'`、`newStage === 'lost'` 時のみ `status='lost'` に自動遷移する。それ以外のステージ変更では status は変わらない
- `issuePoliciesFromOpportunity` は **全 ProposalProduct を一括発行**し、Opportunity.status を `won` に遷移させる（一部成立ロジックは実装なし）
- `isOpenOpportunity` ユーティリティ: `status ∈ {open, on_hold}` かつ `stage !== 'lost'` かつ `effectiveStage !== 'issued'` の場合にアクティブ判定する（`on_hold` は「保留中でもアクティブ」扱い）
- **[要確認]**: `partial_won` 状態の Opportunity が一覧でどうフィルタリングされるか（status 別フィルター導線済み）・一覧バッジ表示の UI 実装は確認が必要

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
