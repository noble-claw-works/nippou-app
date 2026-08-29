# ユーザー別ユースケース一覧 (USE_CASE_LIST)

> **対象システム**: 305 nippou-app — 保険営業支援フルCRUDモック  
> **作成日**: 2026-08-17  
> **正本**: 実コード (`src/types/index.ts`, `src/App.tsx`, `src/store/index.ts`, `src/pages/`)  
> **注意**: 本ドキュメントは実装済み機能のみ記載。モック環境（Zustand + localStorage）のためAPIバックエンドは存在しない。
> **更新 2026-08-25**: タスク初期値マスタ／IA再編（メニュー5項目）／日報3点（過去ブロック閲覧・日付ナビ統一・日報一覧）を反映。

---

## 1. ロール早見表

| ロール | 主目的 | アクセス可能画面（ナビメニュー表示） |
|---|---|---|
| `general`（一般社員） | 自分の日報作成・顧客記録・商談管理・上長への報告 | /today, /dashboard(個人tab), /sales-perf, /calendar, /search, /households, /opportunities, /policies, /settings, /notifications |
| `manager`（上長） | 部下日報レビュー・コメント・差し戻し・承認＋パイプライン管理 | 上記全て + /report-admin, /dashboard(チームtab) |
| `executive`（経営者） | 全社俯瞰・経営判断・読取専用管理確認 | 上記全て（/report-admin） + /admin（読取専用） |
| `admin`（管理者） | ユーザー・チーム・組織管理 | 上記全て + /admin（フル権限） + /templates |

> **コード根拠**: `src/components/layout/AppShell.tsx` の NAV_ITEMS 定義。`/report-admin` は manager/executive/admin のみ表示、`/templates` は admin のみ表示、`/admin` は admin/executive のみ表示。

---

## 2. ロールごとのユースケース一覧

### 2-1. general（一般社員）

| UC-ID | ユースケース名 | トリガー | 主な手順（要約） | 使用画面 | 前提/権限 |
|---|---|---|---|---|---|
| UC-G-01 | 日報の新規作成・朝の入力 | 営業日の朝に /today を開く | ① 当日日報が自動生成される ② 朝の気分(MoodType: sunny/partly_cloudy/cloudy/rainy)を選択 ③ 上長への合図(consult/listen/ok)を選択 ④ 予定タイムブロックを追加 | /today | ログイン済み。status=planning→in_progress |
| UC-G-02 | 訪問前の世帯情報確認 | 訪問前に世帯員構成・健康情報を確認したい | ① /households で世帯を検索 ② 世帯詳細で世帯員一覧(続柄・生年月日・健康情報)を確認 ③ familyMemoで家族構成メモを再確認 | /households, /households/:id | 担当世帯が存在すること |
| UC-G-03 | 訪問実績の記録 | 顧客訪問後に実績タイムブロックを追加 | ① /today の実績タイムラインに「実績ブロック」追加 ② コンボボックスで顧客選択（お気に入り⭐・最近接触🕒を優先表示） ③ メモ・集金・次回AP・提案内容を入力 ④ 保存 | /today | 担当世帯が存在すること。status=in_progress |
| UC-G-04 | 日報内でのステージ進捗更新 | 訪問実績ブロック追加時に商談ステージを変更したい | ① 実績ブロック追加時に世帯選択後「商談案件（任意）」欄が出現 ② 案件を選択→「ステージを変更する（現在: XX）」ボタンが展開 ③ 新ステージを選択→「ステージを更新」 ④ stageHistoryに自動追記・localStorage永続化 | /today | 担当Opportunityが存在すること |
| UC-G-05 | TODO管理（追加・達成・延長） | 日次のTODO達成状況を更新 | ① /today 右ペインでTODOを追加（優先度: high/medium/low） ② 達成チェック/doing/done状態を更新 ③ 期限延長（dueDate更新） | /today | status=in_progress |
| UC-G-06 | コメント投稿（上長宛） | 上長への質問・補足を送る | ① /today または /reports/:date のコメントセクションで「↑ 上長宛」バッジ付きコメントを投稿 | /today, /reports/:date | status=in_progressまたはsubmitted |
| UC-G-07 | 日報の提出 | 夕方に当日日報を提出 | ① 夕の気分を入力 ② 「日報提出」ボタンをクリック → status: in_progress → submitted ③ 上長に通知が送られる | /today | status=in_progress |
| UC-G-08 | 過去日報の検索・閲覧 | 過去日報を月単位で振り返る | ① /search で日付・キーワード等で絞り込み ② /calendar で月表示から日付を選択 ③ /reports/:date で詳細閲覧 | /search, /calendar, /reports/:date | 自分の日報のみ閲覧可能 |
| UC-G-09 | 商談案件の新規作成 | 顧客に新規提案を開始する | ① /opportunities → 「+ 新規案件」または /households/:id の「+ 商談追加」から QuickOpportunityModal を開く ② 世帯・タイトル・ステージ・担当者を入力 ③ 作成 | /opportunities, /households/:id | ログイン済み |
| UC-G-10 | 商談ステージ進捗更新（案件詳細から） | /opportunities/:id でステージを手動変更 | ① /opportunities/:id を開く ② 「ステージ変更」ボタンから StageSelector を開く ③ 新ステージ(approach→fact_finding→needs_analysis→proposal→negotiation→application→underwriting→issued/lost)を選択 ④ stageHistoryに自動追記 | /opportunities/:id | 自担当Opportunityのみ編集可 |
| UC-G-11 | 提案商品の追加・編集 | 商談に保険商品（ProposalProduct）を追加 | ① /opportunities/:id の「商品」タブ → ProposalProductEditModal を開く ② 保険会社・商品名・カテゴリ・月払額・被保険者を入力 ③ 保存 | /opportunities/:id | 自担当Opportunityのみ |
| UC-G-12 | 契約発行（受注） | 申込が確定した商談から契約を発行 | ① /opportunities/:id で「🎉 契約発行（受注）」ボタン → QuickPolicyIssueModal ② 提案商品一覧(ProposalProducts)を確認 ③「発行する」→ Policy が ProposalProduct から 1:1 で自動生成(status: pending) ④ Opportunity が stage: issued / status: won に遷移 | /opportunities/:id | 自担当Opportunity。ProposalProductが1件以上存在すること |
| UC-G-13 | 証券番号入力・契約有効化 | 保険会社から証券番号が届いたら契約を有効化 | ① /policies で該当Policy(status: pending)を開く ② 「証券番号を入力」ダイアログ → 証券番号 + 契約開始日を入力 ③「有効化」→ status: pending → inforce に昇格 ④ PolicyStatusHistoryに「証券番号: <番号>」メモ付きで自動記録 | /policies, /policies/:id | 自担当Policy(pending状態) |
| UC-G-14 | 保障マトリクス確認・保障漏れ発見 | 世帯の保険カバレッジを確認し保障漏れを把握 | ① /households/:id → 「🛡️ 保障マトリクス」セクション ② 行=世帯員(Person)・列=保障種別(死亡/入院/がん/就業不能/介護/貯蓄)でマトリクス表示 ③ `-`（保障なし）のセルが「保障漏れ」のサイン ④ 世帯主に死亡保障なしなら赤警告バナー自動表示 | /households/:id | 担当世帯が存在すること |
| UC-G-15 | 保障漏れを端緒に新規商談作成 | 保障漏れを発見したら新規Opportunityを作成 | ① 保障マトリクスで`-`セルを確認 ② /opportunities → 「+ 新規案件」→ QuickOpportunityModal ③ 保障漏れをエビデンスに商談タイトル・内容を入力し作成 | /households/:id, /opportunities | ログイン済み |
| UC-G-16 | 世帯まとめ入力（HouseholdBatchEntry） | 1世帯の複数Opportunityをまとめて効率入力 | ① /households/:id → 「まとめ入力」ボタン → /households/:id/batch-entry ② 複数のDraftOpportunityを並べて入力・バリデーション ③ 一括保存 | /households/:id/batch-entry | 担当世帯が存在すること |
| UC-G-17 | 商談活動報告の入力 | 商談単位で訪問活動を記録する | ① /opportunities/:id/report を開く ② 報告日・活動タイプ(visit/phone/web/other)・サマリ・提案内容・次アクションを入力 ③ 確度ラダー(S/A/B/C/D/fixed)を設定 ④ 保存→日報タイムブロックへ自動連携(syncOppReportToNippou) | /opportunities/:id/report | 自担当Opportunity |
| UC-G-18 | 世帯情報の管理（作成・編集・削除） | 担当世帯の情報を最新化 | ① /households から世帯一覧を開く ② 世帯新規追加または既存世帯を編集（名前・エリア・タグ・メモ・familyMemo） ③ 付帯情報なし世帯のみ削除可 | /households, /households/:id | 付帯情報あり世帯(🔗)の削除は不可 |
| UC-G-19 | 世帯員（Person）の追加・編集・削除 | 世帯員の構成情報を管理 | ① /households/:id → 世帯員セクション → PersonEditModal ② 氏名・続柄・生年月日・性別・職業・喫煙・健康メモを入力 | /households/:id | ログイン済み |
| UC-G-20 | 営業実績ダッシュボードの閲覧 | 自分の営業実績を多角的に把握 | ① /sales-perf を開く ② GlobalFilterBarで期間・ユーザーを絞り込み ③ S1サマリー/S2予算目標/S3プロセス/S4チャネル/S5保険会社・種目/S6ライフプラン/S7契約明細の各画面を切替閲覧 | /sales-perf | generalは本人データのみ |
| UC-G-21 | パスワード変更・設定変更 | ログインパスワードや表示設定を変更 | ① /settings を開く ② 現パスワード入力→新パスワード設定 | /settings | ログイン済み |
| UC-G-22 | 通知の確認 | システム通知（コメント・差し戻し・承認）を確認 | ① /notifications を開く ② 未読通知一覧を確認。既読化 | /notifications | ログイン済み |
| UC-G-23 | 日報一覧の検索・閲覧（2026-08-25） | 過去の日報を検索して一覧・詳細を確認 | ① /nippou →「日報一覧」タブ ② 日付範囲・ステータス・キーワードで絞り込み ③ 行をクリックして該当日報の詳細へ | /nippou（日報一覧タブ）/ NippouListPage | 可視範囲: general=自分の日報のみ、manager/executive/admin=全員の日報 |
| UC-G-24 | 過去日報のブロック詳細閲覧（2026-08-25） | 提出済み・承認済み日報のタイムラインブロックをクリックして詳細を閲覧 | ① 過去日報を開く ② 予定/実績ブロックをクリック ③ 詳細（種別・時刻・タイトル・メモ・顧客/商談リンク）を閲覧（read-only、編集不可） | /nippou, /reports/:date | general以上 |
| UC-G-25 | 日付ナビゲーション（2026-08-25） | 日報上部の「←/→」で日報が存在する日へ移動 | ① 日報画面上部の日付「←/→」を押す ② 日報のない日（土日等）はスキップして前/次の日報へ移動 | /nippou, /reports/:date | general以上 |

---

### 2-2. manager（上長）

> generalのUC-G-01〜G-22に加え、以下のマネージャー固有ユースケースを持つ。

| UC-ID | ユースケース名 | トリガー | 主な手順（要約） | 使用画面 | 前提/権限 |
|---|---|---|---|---|---|
| UC-M-01 | 提出状況の確認 | 朝に部下の日報提出状況・遅延・気分を確認 | ① /report-admin を開く ② SubmissionStatsTableで当日の提出率・未提出者を確認 ③ 未提出メンバーがいれば /notifications でリマインダー確認 | /report-admin, /notifications | manager/executive/admin |
| UC-M-02 | 部下日報へのコメント | 提出済日報にフィードバックを投稿 | ① /reports/:date を開く ② コメントセクションで部下にテキストコメントを投稿（青系アバター） ③「↑ 上長宛」バッジ付きコメントにYES/NO返答またはテキスト返信 | /reports/:date | manager/executive。他人日報へのコメント |
| UC-M-03 | 日報の差し戻し | 内容不備の日報を差し戻す | ① /reports/:date → 「差し戻す」ボタン ② 差し戻し理由（必須入力）を入力 ③ 確定 → status: submitted → in_progress に遷移。general に通知 | /reports/:date | manager/executive/admin。status=submitted |
| UC-M-04 | 日報の承認（確認） | レビュー完了した日報を承認クローズ | ① /reports/:date → 「承認」ボタン（または /report-admin の一括確認） ② status: submitted → confirmed に遷移 | /reports/:date, /report-admin | manager/executive/admin。status=submitted |
| UC-M-05 | 一括承認 | 複数の提出済日報を一括で承認 | ① /report-admin → BulkConfirmPanel ② 承認対象を選択 ③「一括承認」実行 → bulkConfirmReports() | /report-admin | manager/executive/admin |
| UC-M-06 | チームの商談パイプライン確認 | チームメンバーの商談進捗を俯瞰 | ① /opportunities を開く ② ロールフィルターで部下担当案件を確認 ③ ステージ別進捗・次アクション期日の近い案件を優先確認 ④ 案件詳細→「活動履歴」タブで最近の訪問記録を確認 | /opportunities, /opportunities/:id | managerは部下担当Opportunity全件閲覧可 |
| UC-M-07 | チームの契約一覧確認 | 部下担当の契約を俯瞰し、未有効化を管理 | ① /policies → statusフィルターで「申込中(pending)」を絞り込み ② 証券番号未入力の契約を確認し担当者へ入力を促す | /policies | managerはチームメンバー担当Policy閲覧可 |
| UC-M-08 | 営業実績ダッシュボード（個人・チーム） | 期間・メンバー別の実績を分析 | ① /dashboard → タブ切替（個人/チーム） ② PersonSelectorで表示対象ユーザーを選択 ③ PeriodSwitcherで月次/四半期/年間を切替 ④ AchievementCardRow・SalesFunnelPanel等で実績確認 | /dashboard | manager以上。個人tabはgeneralも可 |
| UC-M-09 | 営業目標（ノルマ）の設定 | メンバーまたはチームの営業目標を設定・更新 | ① /dashboard → TargetEditModal ② 対象(個人/チーム)・期間種別(monthly/quarterly/annual)・目標件数・目標保険料を入力 ③ 保存（upsertTarget） | /dashboard | manager/executive/admin のみ目標編集可 |
| UC-M-10 | チームダッシュボードの閲覧 | チーム全体の進捗・メンバーランキングを確認 | ① /dashboard → 「チーム」タブ ② チームを選択 ③ TeamSummaryCard・MemberRankingTable・UnderTargetAlertを確認 | /dashboard（チームtab） | manager以上。generalはForbidden表示 |
| UC-M-11 | 自分自身の日報作成（上長も記録） | 上長も自身の日報を書く | ① /report-admin → 「✍️ 自分の日報を書く」ボタン → /today?self=1 ② 通常の日報作成フローを実行 | /report-admin, /today | manager/executive |
| UC-M-12 | 全員の日報一覧検索（2026-08-25） | 部下・他の管理職を含む全員の日報を検索・閲覧 | ① /nippou →「日報一覧」タブ ② 作成者・日付範囲・ステータスで絞り込み（提出状況の把握） ③ 行クリックで該当日報へ | /nippou（日報一覧タブ） | manager/executive/admin（全員の日報） |

---

### 2-3. executive（経営者）

> generalのUC-G-01〜G-22 + managerのUC-M-01〜M-11（目標編集含む）に加え、以下のexecutive固有ユースケースを持つ。

| UC-ID | ユースケース名 | トリガー | 主な手順（要約） | 使用画面 | 前提/権限 |
|---|---|---|---|---|---|
| UC-E-01 | 全社商談パイプライン俯瞰 | 全社の商談状況を経営視点で把握 | ① /opportunities を開く ② 全担当者・全案件を俯瞰 ③ ステージ別フィルターで引受査定中件数・合計月払額等を確認 | /opportunities | executiveは全社Opportunity閲覧可 |
| UC-E-02 | 全社の営業実績・保険会社別分析 | 全社の実績・契約分布を経営視点で把握 | ① /dashboard で全社の達成状況・営業ファネル・直近成約(SalesFunnelPanel/RecentPoliciesPanel)を俯瞰 ② /sales-perf の S5（保険会社・種目別）で保険会社ごとの契約分布を確認 ③ PersonSelectorで全ユーザーを選択して個別実績を確認 | /dashboard, /sales-perf | executiveは全ユーザーを選択可。※旧USER_GUIDEの「契約ステータス分布グラフ」はSalesDashboardPageの現行実装には存在しない（AchievementCardRow/TargetProgressCard/SalesFunnelPanel/RecentPoliciesPanelの4パネル構成） |
| UC-E-03 | /admin 読取専用閲覧 | 組織図・チーム編成・監査ログを参照 | ① /admin を開く ② 黄色バナー（「経営者ロールでは閲覧のみ可能」）が表示 ③ ユーザー一覧で組織図を確認 ④ チーム編成・上長配置を把握 ⑤ 監査ログで管理操作履歴を確認 | /admin | executiveのみ。編集・招待・削除ボタンは非表示 |
| UC-E-04 | 全社日報レビュー・コメント | 任意メンバーの日報に経営目線コメントを追加 | ① /reports/:date?user=:userId で任意メンバーの日報を閲覧 ② コメントセクションで経営視点のコメントを投稿 ③ 差し戻し・承認も可能 | /reports/:date, /report-admin | executiveは全メンバーの日報へコメント/差し戻し/承認可 |

---

### 2-4. admin（管理者）

> 全ロールのユースケースに加え、以下のadmin固有ユースケースを持つ。

| UC-ID | ユースケース名 | トリガー | 主な手順（要約） | 使用画面 | 前提/権限 |
|---|---|---|---|---|---|
| UC-A-01 | ユーザー招待 | 新入社員・異動者をシステムに追加 | ① /admin → 👥 ユーザータブ → 「招待」ボタン ② 氏名・メール・ロール・チームを指定して招待 ③ 対象者が初回ログイン → status: invited → active ④ ロールに応じた画面に遷移 | /admin | adminのみ |
| UC-A-02 | ユーザー編集（ロール・チーム変更） | 異動・昇格に伴いユーザー情報を変更 | ① /admin → ユーザータブ → 「編集」ボタン ② ロール・teamIdsを変更して保存 | /admin | adminのみ |
| UC-A-03 | ユーザー無効化 | 退職者を無効化（データは保持） | ① /admin → ユーザータブ → 「無効化」ボタン ② status: active → inactive（完全削除はしない・履歴保持） | /admin | adminのみ |
| UC-A-04 | チーム編集（メンバー・上長管理） | 組織変更に伴いチーム構成を変更 | ① /admin → 🏢 チームタブ → 「編集」ボタン ② メンバー追加・上長指定（チェックボックス式）して保存 | /admin | adminのみ |
| UC-A-05 | チーム作成・削除 | 新チームを作成または廃止チームを削除 | ① /admin → チームタブ → 「新チーム作成」または「削除」 ② 削除時は確認ダイアログ+名前入力で誤操作防止 ③ 削除されたチームのメンバーは自動的にチーム外に | /admin | adminのみ |
| UC-A-06 | 監査ログ確認 | 管理操作の履歴を確認・不審操作を検知 | ① /admin → 📜 監査ログタブ ② 操作者・アクション・対象・結果(success/failure)・IPを一覧確認 ③ P1ロック発動（失敗ログイン多数）があれば対象ユーザーに連絡 | /admin | admin/executive（executiveは読取専用） |
| UC-A-07 | テンプレート管理 | 日報テンプレートを作成・公開・無効化 | ① /templates を開く ② テンプレートを新規作成（ブロック種別: single_line/multi_line/timeline/todo/customer/radio/yn/number/attachment） ③ draft → published に公開 ④ 不要テンプレートを無効化 | /templates | adminのみ |

---

## 3. 画面 × ロール権限マトリクス

> **検算メモ**: USER_GUIDE.md の既存マトリクスをコード（`src/pages/`, `src/components/layout/AppShell.tsx`, `src/store/index.ts`, `src/utils/customerAttachment.ts`）で検算。乖離があった箇所に `※` コメントを付記。

| 画面 / 操作 | general | manager | executive | admin | コード根拠・備考 |
|---|---|---|---|---|---|
| `/today`（自分） | ✅ | ✅（?self=1 で自分用） | ✅（?self=1 で自分用） | ✅ | TodayPage。manager/executiveはデフォルトで /report-admin にリダイレクト |
| `/reports/:date`（自分） | ✅ | ✅ | ✅ | ✅ | ReportDetailPage |
| `/reports/:date`（他人）閲覧 | ✅ | ✅ | ✅ | ✅ | ※USER_GUIDE.mdでは「✅」だが generalは実際に他人日報を開ける（閲覧のみ） |
| `/reports/:date`（他人）コメント投稿 | ❌ | ✅ | ✅ | ✅ | `canComment = role==='manager'\|'executive'`。generalは自分の日報コメントのみ可（canCommentAsAuthor） |
| 他人日報の差し戻し | ❌ | ✅ | ✅ | ✅ | withdrawReport。UI層で制御（showSendBackボタン表示条件） |
| 他人日報の承認（confirmed） | ❌ | ✅ | ✅ | ✅ | confirmReport呼出。UI層で制御 |
| `/report-admin` | ❌（Forbidden） | ✅ | ✅ | ✅ | ReportAdminPage内でロールガード。NAV_ITEMSでも非表示 |
| `/calendar` | ✅ | ✅ | ✅ | ✅ | CalendarPage |
| `/search` | ✅ | ✅ | ✅ | ✅ | SearchPage |
| `/dashboard`（個人tab） | ✅ | ✅ | ✅ | ✅ | SalesDashboardPage。generalは本人データのみ |
| `/dashboard`（チームtab） | ❌（Forbidden） | ✅ | ✅ | ✅ | TeamDashboardPage内でgeneralにForbidden表示 |
| 営業目標の編集 | ❌ | ✅ | ✅ | ✅ | `canEditTarget = role===manager\|executive\|admin` |
| `/sales-perf` | ✅ | ✅ | ✅ | ✅ | SalesPerfPage。全ロールアクセス可（NAV_ITEMS確認） |
| `/households`（一覧・詳細） | ✅ | ✅ | ✅ | ✅ | HouseholdsPage / HouseholdDetailPage |
| `/households`（世帯削除・付帯情報なし） | ✅ | ✅ | ✅ | ✅ | deleteCustomer。hasCustomerAttachment()=false の場合 |
| `/households`（世帯削除・付帯情報あり🔗） | ❌ | ❌ | ✅ | ✅ | hasCustomerAttachment()=true の場合。UI層+store層で二層防御 |
| 世帯員（Person）追加・編集・削除 | ✅ | ✅ | ✅ | ✅ | addPerson/updatePerson/deletePerson |
| `/households/:id/batch-entry`（世帯まとめ入力） | ✅ | ✅ | ✅ | ✅ | HouseholdBatchEntryPage |
| `/opportunities`（一覧閲覧） | ✅（自担当のみ） | ✅（部下担当含む） | ✅（全社） | ✅（全社） | OpportunitiesPage内のロールフィルタ |
| `/opportunities`（案件作成） | ✅ | ✅ | ✅ | ✅ | addOpportunity |
| `/opportunities`（案件編集・ステージ変更） | ✅（自担当） | ✅ | ✅ | ✅ | updateOpportunity / updateOpportunityStage |
| `/opportunities`（案件削除） | ✅（自担当） | ✅ | ✅ | ✅ | deleteOpportunity |
| `/opportunities/:id/report`（活動報告） | ✅ | ✅ | ✅ | ✅ | OpportunityReportPage |
| 契約発行（QuickPolicyIssue） | ✅ | ✅ | ✅ | ✅ | issuePoliciesFromOpportunity |
| `/policies`（一覧閲覧） | ✅（自担当のみ） | ✅（チーム） | ✅（全社） | ✅（全社） | PoliciesPage内のロールフィルタ |
| `/policies`（契約有効化・証券番号入力） | ✅（自担当） | ✅ | ✅ | ✅ | activatePolicy |
| `/policies`（ステータス変更: 払済/解約/満期） | ✅（自担当） | ✅ | ✅ | ✅ | changePolicyStatus |
| `/policies`（契約編集: PolicyEditModal） | ✅（自担当） | ✅ | ✅ | ✅ | updatePolicy |
| `/admin`（アクセス） | ❌（Forbidden） | ❌（Forbidden） | ✅（読取専用） | ✅（フル） | AdminPage内でロールガード。NAV_ITEMSでも非表示 |
| ユーザー招待・編集・無効化 | ❌ | ❌ | ❌ | ✅ | UsersTab。canEdit=role===admin |
| チーム編集・削除 | ❌ | ❌ | ❌ | ✅ | TeamsTab。canEdit=role===admin |
| 監査ログ閲覧 | ❌ | ❌ | ✅ | ✅ | AuditLogTab。/admin アクセス自体が executive/admin のみ |
| `/templates`（テンプレート管理） | ❌ | ❌ | ❌ | ✅ | TemplatesPage。NAV_ITEMSで admin のみ表示 |
| `/notifications` | ✅ | ✅ | ✅ | ✅ | NotificationsPage |
| `/settings` | ✅ | ✅ | ✅ | ✅ | SettingsPage |

### 権限マトリクスの主要なコード乖離（USER_GUIDE.md との差分）

1. **`/today` のmanager/executive動作**: USER_GUIDE.mdでは「✅」とだけ記載されているが、実コードでは manager/executive は `/today` を開くとデフォルトで `/report-admin` にリダイレクトされる。`?self=1` パラメータ付きでアクセスした場合のみ自分の日報作成画面が表示される。
2. **generalの他人日報閲覧**: USER_GUIDE.mdでは「✅」だが実コードでも一致。ただし他人日報への**コメント投稿**は `canCommentAsAuthor`（自分の日報のみ）で制限されており、他人日報にはコメント不可。
3. **付帯情報あり世帯の削除**: USER_GUIDE.mdで「executive/admin: ✅」とあるが、`hasCustomerAttachment()` で判定するstore層の二層防御がある。実際の削除制限はUI層+store層の両方で動作。

---

## 4. データモデルサマリー（主要エンティティ）

| エンティティ | 型名 | 主なフィールド | 備考 |
|---|---|---|---|
| 世帯 | `Household`（`Customer`はエイリアス） | id, name, type, area, primaryUserId, headPersonId, familyMemo, tags, status | type: individual/corporate/prospect |
| 世帯員 | `Person` | id, householdId, name, relation, birthDate, gender, smoker, healthNotes | relation: head/spouse/child/parent/sibling/other |
| 商談案件 | `Opportunity` | id, householdId, ownerId, stage, status, proposalProducts, stageHistory, milestones, confidence | stage: 9段階。status: open/won/partial_won/lost/on_hold |
| 提案商品 | `ProposalProduct` | id, productCategory, productName, insurer, insuredPersonId, monthlyPremium | Opportunityに埋め込み |
| 保険契約 | `Policy` | id, policyNumber, householdId, ownerId, contractorPersonId, insurer, status, startDate, coverages | status: inforce/lapsed/surrendered/matured/paid_up/reduced/pending |
| 日報 | `DailyReport` | id, userId, date, status, blocks, todos, morningMood, eveningMood, managerSignal, comments | status: planning/in_progress/submitted/confirmed |
| タイムブロック | `TimeBlock` | id, reportId, type, startTime, endTime, customerId, opportunityId, isPlanned, isActual | type: visit/office/phone/travel/break/meeting/lunch |
| 営業目標 | `SalesTarget` | id, scope, ownerId, periodType, period, targetPolicyCount, targetPremium | scope: individual/team |
| ユーザー | `User` | id, name, email, role, teamIds, status | role: general/manager/executive/admin |
| チーム | `Team` | id, name, managerIds, memberIds | |
| 監査ログ | `AuditLog` | id, userId, action, targetType, result, diff | result: success/failure |

---

*本ドキュメントは実コードを正本として作成。未確認点は「[要確認]」を付記。*
