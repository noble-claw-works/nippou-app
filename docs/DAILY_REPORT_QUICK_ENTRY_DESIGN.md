# 日報クイック登録改修 設計書 — 新規世帯・新規商談を日報から一気通貫登録

対象: nippou-app (305) / staging
作成: architect (青龍配下) / 2026-07-05
前提: モック実装(DB変更なし)。既存の型・命名・モーダル流儀に厳密準拠。

---

## ① 課題

日報の時間ブロック入力(`BlockModal`)で、既存の世帯・商談は「選択」できるが、**新規の世帯を日報から登録できない**。

- 現状、新規顧客を登録するには世帯一覧ページ(`/households`)へ遷移 → `HouseholdForm` で世帯作成 → 日報へ戻る、という往復が必要で煩わしい。
- 一方、**新規「商談」は既に `QuickOpportunityModal` で日報から作れる**(ただし世帯が選択済みであることが前提)。
- ゴール: **日報を一切離れずに 新規世帯 → (任意で)新規商談 を登録し、その時間ブロックへ即紐付ける**動線を追加する。既存の世帯一覧からの登録動線は残す(破壊しない)。

---

## ② 新規/変更コンポーネント一覧

| 種別 | ファイル | 内容 |
|---|---|---|
| **新規** | `src/components/household/QuickHouseholdModal.tsx` | 日報から呼べる世帯クイック作成モーダル。`QuickOpportunityModal` の流儀を踏襲。作成後 `customerId` を親へ返す。 |
| **変更** | `src/components/today/BlockModal.tsx` | 顧客コンボに「＋新規世帯を登録」導線を追加(`CustomerCombobox` の既存 `onAddNew` を配線)。`QuickHouseholdModal` の状態管理と、作成→紐付け→続けて商談作成の連結フローを実装。 |
| **変更** | `src/components/ui/CustomerCombobox.tsx` | `onAddNew` のフッタ導線を「該当なし時のみ」から「常時フッタ表示」に拡張(該当ありでも新規登録できるように)。**既存 API は非破壊**(`onAddNew` 未指定なら従来通り非表示)。 |

> 注: `store`(`addCustomer`/`addPerson`/`addOpportunity`)・型(`types/index.ts`)・`OpportunityCombobox`・`QuickOpportunityModal` は**変更不要**。既存 API をそのまま利用する。

---

## ③ データ / store 契約(実コード準拠)

### 3-1. `addCustomer` (世帯作成)
```ts
// store/index.ts
addCustomer: (customer: Omit<Customer, 'id'>) => Customer
// 実装: id を uid() で採番して返すだけ(バリデーションなし)
```
`Customer` = `Household`。**QuickHouseholdModal が渡すべき必須フィールド**(型定義 `Household` より):
```ts
addCustomer({
  name,                    // 必須(フォーム入力・trim)
  type,                    // HouseholdType = 'individual' | 'corporate' | 'prospect'。既定 'individual'
  area,                    // string(空文字許容)
  primaryUserId,           // 既定 currentUserId(担当=作成者)
  familyMemo: '',          // string 必須(空文字)
  tags: [],                // string[] 必須
  memo: '',                // string 必須
  status: 'active',        // HouseholdStatus 必須
  // headPersonId は任意 → 代表者を同時登録する場合のみ後段で updateCustomer で設定
})
```
> `HouseholdsPage` の `addCustomer` 呼び出しと同一の必須集合。`id: ''` を渡している既存コードがあるが `addCustomer` 内で `uid()` により上書きされるため、`Omit<Customer,'id'>` 準拠で `id` は渡さないのが正。

### 3-2. `addPerson` (代表者=世帯主を同時登録する場合のみ)
```ts
addPerson: (householdId: string, partial: Omit<Person,'id'|'householdId'|'createdAt'|'updatedAt'>) => Person
```
`Person` 必須は `name` と `relation`(`PersonEditModal` 既定 `relation:'head'`)。代表者名を入力した場合のみ:
```ts
const head = addPerson(newCustomer.id, { name: repName.trim(), relation: 'head', memo: '' });
updateCustomer(newCustomer.id, { headPersonId: head.id });
```
> **代表者は任意項目**とする(下記④参照)。理由: 既存 `HouseholdForm`(世帯一覧の新規追加)も Person を必須にしておらず、世帯のみ作成できる。クイック登録は「最小項目で素早く」が目的なので世帯本体+任意で代表者名1つ、に留める。

### 3-3. `addOpportunity` (連結フローで既存 `QuickOpportunityModal` が使用)
```ts
addOpportunity: (partial: Omit<Opportunity,'id'|'stageHistory'|'createdAt'|'updatedAt'|'totalMonthlyPremium'>) => Opportunity
```
BlockModal は既に `QuickOpportunityModal` を保持しており、`householdId`/`householdName` を渡せば商談作成→`onCreated(opportunityId)` で紐付く。**新規世帯作成後に同じ導線へ合流する**だけ。

### 3-4. リアクティブ反映
`TodayPage` は `customers`(store)を `BlockModal` に渡している。`addCustomer` で store 更新 → `customers` 配列が更新され、コンボの候補に**自動で現れる**。ただしクイック作成では戻り値の `customer.id` を**即 `block.customerId` にセット**して確定紐付けするため、候補反映を待つ必要はない。

### 3-5. 権限
- `HouseholdsPage` は `canAdd = currentRole !== undefined`(= 全ロール。general 含む)で世帯追加可。**general 営業も世帯を作成できる**のが既存仕様。
- `QuickOpportunityModal` も権限ガードなしで `addOpportunity` を呼ぶ(general 可)。
- → **クイック世帯登録も権限ガード不要**。既存踏襲でよい(将来ロール制限が必要になれば `currentRole` で分岐)。

---

## ④ UI 動線図(テキスト)

### 世帯クイック作成モーダル(QuickHouseholdModal)の項目
`QuickOpportunityModal` のレイアウト(fixed overlay + max-w-md カード + header/body/footer)を踏襲。最小項目:

```
┌─ 🏠 新規世帯を作成 ───────────────────[×]┐
│ 世帯名 *        [___________________]      │  ← 必須
│ 区分            (個人)(法人)(見込み)       │  ← 既定 個人
│ エリア          [___________________]      │  ← 任意
│ 主担当          [ select users(active) ]   │  ← 既定 currentUser
│ 代表者名 (任意) [___________________]      │  ← 入力時のみ head Person 同時登録
│ メモ (任意)     [___________________]      │
├───────────────────────────────────────────┤
│                 [キャンセル] [作成して選択] │
└───────────────────────────────────────────┘
```

### 連結フロー全体
```
[BlockModal] 顧客コンボ ▼
  └─ ドロップダウン最下部フッタ: 「＋ 新規世帯を登録」   ← CustomerCombobox.onAddNew
        │ click
        ▼
  [QuickHouseholdModal] 世帯名等を入力 → 「作成して選択」
        │ addCustomer(...) → newCustomer
        │ (代表者名入力時) addPerson + updateCustomer(headPersonId)
        │ onCreated(newCustomer.id)
        ▼
  BlockModal: block.customerId = newCustomer.id (即紐付け) / opportunityId = undefined
        │
        │ ── 一気通貫オプション ──
        │   QuickHouseholdModal を「作成して続けて商談を追加」で閉じた場合、
        │   直後に既存 QuickOpportunityModal(householdId=newCustomer.id) を自動オープン
        ▼
  [QuickOpportunityModal] 案件名等 → 「作成して選択」
        │ addOpportunity(...) → onCreated(opportunityId)
        ▼
  BlockModal: block.opportunityId = opportunityId (即紐付け)
        ▼
  日報ブロック保存(既存 handleSave)
```

「作成して選択」= 世帯のみ作って閉じる。「作成して続けて商談」= 世帯作成後に商談モーダルを連続で開く(ワンストップ)。フッタにボタン2つを並べる。

---

## ⑤ 実装タスク分解(coder 向け・順序付き)

> 実装前に必読スキル: `ui-design-standards`。DB変更なし(モックのみ)。既存の Tailwind クラス/絵文字/文言トーンに合わせること。

1. **`QuickHouseholdModal.tsx` 新規作成**
   - `QuickOpportunityModal.tsx` をひな型にコピーして改変。overlay/card/header/body/footer 構造・className を踏襲。
   - Props:
     ```ts
     interface Props {
       onCreated: (customerId: string, opts: { continueToOpportunity: boolean }) => void;
       onClose: () => void;
     }
     ```
   - state: `name, type('individual'), area, primaryUserId(既定 currentUserId), repName, memo, error`。
   - store: `const { addCustomer, addPerson, updateCustomer, currentUserId, users } = useAppStore();`
   - 主担当 select は `users.filter(u => u.status === 'active')`(HouseholdForm 同様)。
   - `handleSubmit(continueToOpportunity: boolean)`:
     - `name.trim()` 空なら `error='世帯名は必須です'` で return。
     - `addCustomer({ name: name.trim(), type, area: area.trim(), primaryUserId: primaryUserId || currentUserId, familyMemo:'', tags:[], memo: memo.trim(), status:'active' })`。
     - `repName.trim()` があれば `addPerson(c.id, { name: repName.trim(), relation:'head', memo:'' })` → `updateCustomer(c.id, { headPersonId: head.id })`。
     - `onCreated(c.id, { continueToOpportunity })`。
   - footer にボタン2つ: 「作成して選択」(`handleSubmit(false)`)/「作成して続けて商談」(`handleSubmit(true)`)。文言・色は既存踏襲(primary=blue-500)。

2. **`CustomerCombobox.tsx` — `onAddNew` を常時フッタ表示に拡張**
   - 既存: `onAddNew` は「該当顧客なし」空リスト時の `<li>` 内でのみ表示。
   - 追加: ドロップダウンの `</ul>` 直後(件数超過フッタと並ぶ位置)に、`onAddNew` があれば**常に**「＋ 新規世帯を登録」フッタボタンを描画。`OpportunityCombobox` の quick add footer(`border-t p-2` + `text-blue-600`)と同トーン。
   - クリックで `onAddNew()` 実行 + `closeDropdown()`。既存の空リスト時ボタンは残してよい(重複回避のため、常時フッタを出すなら空リスト時の内側ボタンは撤去して一本化が望ましい)。
   - **非破壊**: `onAddNew` 未指定なら一切表示しない(既存呼び出し元に影響なし)。

3. **`BlockModal.tsx` — 導線と連結フロー実装**
   - import 追加: `QuickHouseholdModal`。store から `addCustomer` 等は不要(モーダル内で完結)。
   - state 追加: `const [showQuickHousehold, setShowQuickHousehold] = useState(false);`
   - 顧客コンボへ配線:
     ```tsx
     <CustomerCombobox
       ...既存 props...
       onAddNew={() => setShowQuickHousehold(true)}
     />
     ```
   - モーダル描画(既存 `QuickOpportunityModal` の IIFE 群の隣):
     ```tsx
     {showQuickHousehold && (
       <QuickHouseholdModal
         onClose={() => setShowQuickHousehold(false)}
         onCreated={(customerId, { continueToOpportunity }) => {
           onChange(s => ({ ...s, block: { ...s.block, customerId, opportunityId: undefined } }));
           setShowQuickHousehold(false);
           if (continueToOpportunity) setShowQuickAdd(true);   // 既存の商談モーダルへ合流
         }}
       />
     )}
     ```
   - `showQuickAdd`(商談)側は `state.block.customerId` を参照して `household` を引く既存ロジックのまま。新規世帯 `customerId` が既にセットされているので、そのまま `QuickOpportunityModal` が正しい世帯で開く。`householdName` は `customers.find(...)?.name` で解決(store 更新済みなので取得可)。

4. **セルフチェック(coder)**
   - `npx tsc --noEmit`(型)/`npm run lint`。
   - 手動: 顧客未選択 → コンボ ▼ → 「＋新規世帯を登録」→ 世帯作成 → コンボに紐付く → 「続けて商談」で商談も紐付く、を確認。
   - 既存の世帯一覧(`/households`)からの登録が無傷か確認。

5. **doc/テスト**(別 subagent: tester/doc_keeper)
   - `testing-standards` に沿って QuickHouseholdModal の作成→onCreated 契約、代表者同時登録、必須バリデーションの単体テスト追加。
   - 本設計書を最新化。

---

## ⑥ 影響範囲・リスク

**影響範囲(限定的)**
- 変更3ファイル(うち新規1)。store・型・他ページは無改変。
- `CustomerCombobox` は他所でも使われる可能性 → `onAddNew` 未指定の呼び出し元は挙動不変(非破壊)。既存呼び出し元を grep で確認し、フッタ常時表示化が視覚的に問題ないか点検すること。

**リスクと対策**
- **リスク1: フッタ常時表示で既存 UX 変化** → `onAddNew` は BlockModal からのみ渡す。他の `CustomerCombobox` 利用箇所には渡さない限り無変化。
- **リスク2: 代表者を必須にすると「世帯だけ先に作る」ケースを阻害** → 代表者名は任意。空なら Person 未作成(既存 `HouseholdForm` と同じ挙動)。
- **リスク3: 連結フローで商談モーダルが世帯名を拾えない** → `addCustomer` は同期的に store 更新するため、`showQuickAdd` 描画時点で `customers.find` が新規世帯を返す。問題なし。
- **リスク4: 権限** → general 含む全ロールが既存仕様で世帯/商談を作成可。クイック登録も同一。将来の制限は `currentRole` 分岐で後付け可能。
- **リスク5: `id:''` の渡し漏れ** → `addCustomer` は内部で `uid()` 採番。`Omit<Customer,'id'>` に厳密準拠し `id` を渡さないこと(HouseholdsPage の `id:''` は冗長なので新規コードでは踏襲しない)。

**DBスキーマ影響**: なし(モック/store のみ)。
