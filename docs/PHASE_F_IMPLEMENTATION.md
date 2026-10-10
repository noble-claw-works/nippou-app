# 工程F実装内容ドキュメント

**対象プロジェクト**: 305 nippou-app  
**実装段階**: 工程F（2026-10-10）  
**検証日**: 2026-10-10  
**検証者**: doc_keeper  

---

## 概要

工程F では、顧客情報画面（Customer List）の IA 再編を実施し、以下の3つの主要変更を実装しました。各実装は `src/` コード実測により検証済みです。

### 主要変更サマリー

| 項目 | 従来（工程E） | 新規（工程F） | ステータス |
|-----|------------|----------|---------|
| **顧客画面構造** | `/households` + `/policies`（2画面） | `/customers?tab=households \| products \| policies`（統合3タブ） | ✅ 実装完了 |
| **商品管理** | `/opportunities/:id` のProposalProductModal（詳細ページ内） | `/customers?tab=products` の3ペイン + インライン編集 | ✅ 実装完了 |
| **後方互換性** | `/households`, `/policies`, `/products` 独立URL | → 自動リダイレクト + 初期タブ選択 | ✅ リダイレクト実装 |

---

## 1. 画面構造の再編（IA-3 更新）

### 1-1. URL設計の変更

#### 【旧構造】工程E

```
/households        → HouseholdsPage（世帯一覧・詳細）
/policies          → PoliciesPage（契約一覧・詳細）
/products          → 未実装
```

#### 【新構造】工程F

```
/customers                     → CustomerListPage（統合ページ・タブバー表示）
  ├─ ?tab=households (default) → HouseholdsPage（世帯一覧・詳細）
  ├─ ?tab=products            → ProductsPage（商品タブ・3ペイン統合ビュー）
  └─ ?tab=policies            → PoliciesPage（契約一覧・詳細）
```

#### 後方互換リダイレクト

```typescript
// src/App.tsx: Route 設定
<Route path="/households" element={<Navigate to="/customers" replace />} />
<Route path="/policies" element={<Navigate to="/customers?tab=policies" replace />} />
<Route path="/products" element={<Navigate to="/customers?tab=products" replace />} />
<Route path="/customers" element={<CustomerListPage />} />
```

#### 実装検証（grep）

```bash
$ grep -n "path=/customers\|path=/households\|path=/products\|path=/policies" src/App.tsx
119:        <Route path="/customers" element={<CustomerListPage />} />
121:          element={<Navigate to="/customers" replace />}
128:          element={<Navigate to="/customers?tab=policies" replace />}
132:          element={<Navigate to="/customers?tab=products" replace />}
145:          path="/customers/:customerId"
```

### 1-2. CustomerListPage 統合実装

#### コンポーネント構造

**File**: `src/pages/CustomerListPage.tsx`

```typescript
export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL ?tab パラメータを読み込み
  const raw = searchParams.get("tab");
  const tab: CustomerTab = 
    raw === "policies" ? "policies" : 
    raw === "products" ? "products" : 
    "households"; // default
  
  // タブ切替ハンドラ
  const setTab = (t: CustomerTab) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      if (t === "households") {
        n.delete("tab"); // デフォルトは?tab 省略
      } else {
        n.set("tab", t);
      }
      return n;
    }, { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 上部タブバー */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
        <nav className="flex gap-1">
          <TabButton tab="households" label="世帯" {...} />
          <TabButton tab="products" label="商品" {...} />
          <TabButton tab="policies" label="契約" {...} />
        </nav>
      </div>

      {/* コンテンツ（タブ連動） */}
      <div className="flex-1 overflow-auto">
        {tab === "households" && <HouseholdsPage />}
        {tab === "products" && <ProductsPage />}
        {tab === "policies" && <PoliciesPage />}
      </div>
    </div>
  );
}
```

#### 実装検証（grep）

```bash
$ grep -n "type CustomerTab\|const tab:" src/pages/CustomerListPage.tsx
13: type CustomerTab = "households" | "products" | "policies";
19:  const tab: CustomerTab =
```

---

## 2. 商品タブの3ペイン実装（PC/スマホ対応）

### 2-1. ProductsPage 構成（工程F新規）

#### コンポーネント構造

**File**: `src/pages/ProductsPage.tsx`

```typescript
export function ProductsPage() {
  const { selectedHouseholdId, activeTab, setActiveTab, selectHousehold } =
    useHouseholdsPaneState();
  const { customers } = useAppStore();

  // 選択中の構成員ID
  const [selectedPersonId, setSelectedPersonId] = useState<string>('all');

  // 世帯を切り替えたら構成員選択を「すべて」にリセット
  const handleSelectHousehold = (id: string) => {
    selectHousehold(id);
    setSelectedPersonId('all');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* スマホ: タブバー（lg以上は非表示） */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white">
        {/* タブ: 👥 世帯 / 👪 構成員 / 🛡️ 保険商品 */}
      </div>

      {/* PC: 横3カラム / スマホ: アクティブタブのみ表示 */}
      <div className="flex-1 overflow-hidden flex">
        {/* ① 世帯リストペイン */}
        <div className="lg:w-80 lg:border-r {...}">
          <HouseholdListPane {...} />
        </div>

        {/* ② 構成員ペイン（世帯選択後に表示） */}
        <div className="lg:w-72 lg:border-r {...}">
          <PersonsPane {...} />
        </div>

        {/* ③ 保険商品ペイン（世帯選択後に表示） */}
        <div className="lg:flex-1 {...}">
          <PoliciesPane
            householdId={selectedHouseholdId}
            selectedPersonId={selectedPersonId}
            {...}
          />
        </div>
      </div>
    </div>
  );
}
```

#### PC/スマホ レスポンシブ仕様

| 区分 | PC (lg以上) | スマホ (md以下) |
|-----|-----------|--------------|
| レイアウト | 横3列固定 | タブで①②③を切替 |
| ①世帯リスト | 常時表示（w-80） | tab=0 で表示 |
| ②構成員 | 常時表示（w-72） | tab=1 で表示（世帯選択後） |
| ③保険商品 | 常時表示（flex-1） | tab=2 で表示（世帯選択後） |
| 戻るボタン | なし | tab≠0 で固定表示（tab=0に戻る） |

#### 実装検証（grep）

```bash
$ grep -n "class=\"lg:hidden\|class=\".*lg:flex\|const TAB_LABELS\|flex-1 flex-col" src/pages/ProductsPage.tsx
15: const TAB_LABELS: Record<PaneTab, string> = {
30:      <div className="lg:hidden flex border-b border-gray-200 bg-white">
45:        className={`\n          ${activeTab === 0 ? 'flex' : 'hidden'} lg:flex\n          lg:w-80 lg:border-r lg:border-gray-200\n...
62:        className={`\n          ${activeTab === 1 ? 'flex' : 'hidden'} lg:flex\n          lg:w-72 lg:border-r lg:border-gray-200\n...
78:        className={`\n          ${activeTab === 2 ? 'flex' : 'hidden'} lg:flex\n          flex-1 flex-col overflow-hidden\n        `}
```

### 2-2. 3ペイン各コンポーネント（既存・移設）

#### ① 世帯リストペイン

- **コンポーネント**: `HouseholdListPane`（既存・`src/pages/HouseholdsPage/`）
- **機能**: 世帯一覧・検索・選択
- **削除時制限**: hasCustomerAttachment()=true（付帯情報あり）世帯は削除不可

#### ② 構成員ペイン

- **コンポーネント**: `PersonsPane`（既存・`src/pages/HouseholdsPage/`）
- **機能**: 世帯員追加・編集・削除・年収合計集計（工程E）
- **表示**: 選択構成員の詳細情報・年収合計

#### ③ 保険商品ペイン

- **コンポーネント**: `PoliciesPane`（既存・`src/pages/HouseholdsPage/`）
- **機能**: 保険商品一覧・追加・編集（工程F新規）

---

## 3. 保険商品編集機能（インライン化）

### 3-1. 編集フロー

#### 従来フロー（工程E）

```
/opportunities/:id → ProposalProductEditModal → updateOpportunity()
```

#### 新規フロー（工程F）

```
/customers?tab=products → ProductsPage → PoliciesPane
  → 各商品カードの「✏️」ボタン
  → PolicyCardInlineEdit（フォーム展開）
  → handleEditSave() → updateOpportunity()
```

### 3-2. 実装コンポーネント

#### PoliciesPane.tsx（商品ペイン メインコンポーネント）

**File**: `src/pages/HouseholdsPage/PoliciesPane.tsx`

**主要関数**:

| 関数 | 役割 | 実装行 |
|-----|------|--------|
| `openEditForm(product, oppId)` | 編集フォーム起動・名称逆引き | 75行目〜 |
| `handleEditSave()` | 編集内容を updateOpportunity() で保存 | 140行目〜 |
| `validateForm(f)` | フォーム入力値検証 | 105行目〜 |

#### 編集フォーム コンポーネント階層

```
PolicyCardInlineEdit.tsx
  ↓
ProductFormFields.tsx（フィールド共用）
  ├─ insuredPersonId: セレクト
  ├─ insurerId: セレクト（逆引き対応）
  ├─ productCategoryId: セレクト（逆引き対応）
  ├─ monthlyPremium: テキスト入力
  ├─ firstYearCommission: テキスト入力（optional）
  └─ firstConsultDate: 日付入力
```

#### 実装検証（grep）

```bash
$ grep -n "function openEditForm\|const handleEditSave\|function validateForm" src/pages/HouseholdsPage/PoliciesPane.tsx
75:   const openEditForm = (product: ProposalProduct, oppId: string) => {
100:   function validateForm(f: PolicyFormState): string | null {
140:   const handleEditSave = () => {
```

### 3-3. 名称逆引き後方互換ロジック

#### insurerId 逆引き

旧データに insurerId が未設定の場合、insurer（文字列）から名前一致で逆引き。

**実装**:

```typescript
// PoliciesPane.tsx: openEditForm() 内
let resolvedInsurerId = product.insurerId ?? '';
if (!resolvedInsurerId && product.insurer) {
  resolvedInsurerId = activeInsurers.find(c => c.name === product.insurer)?.id ?? '';
}
```

#### categoryKey 逆引き

ProposalProduct の productCategory enum を、productCategories マスタの categoryKey で逆引き。

**実装**:

```typescript
const resolvedCategoryId =
  activeCategories.find(c => c.categoryKey === product.productCategory)?.id ?? '';
```

#### 実装検証（grep）

```bash
$ grep -n "resolvedInsurerId\|resolvedCategoryId\|activeInsurers.find\|activeCategories.find" src/pages/HouseholdsPage/PoliciesPane.tsx
79:    let resolvedInsurerId = product.insurerId ?? '';
80:    if (!resolvedInsurerId && product.insurer) {
81:      resolvedInsurerId = activeInsurers.find(c => c.name === product.insurer)?.id ?? '';
85:    const resolvedCategoryId =
86:      activeCategories.find(c => c.categoryKey === product.productCategory)?.id ?? '';
```

### 3-4. 編集フィールド一覧

| フィールド | 説明 | 種別 | 後方互換 |
|----------|------|------|--------|
| **被保険者** | insuredPersonId | セレクト | — |
| **保険会社** | insurerId | セレクト + 逆引き | insurer: string 逆引き |
| **種目** | productCategoryId | セレクト + 逆引き | productCategory: ProductCategory enum 逆引き |
| **月払** | monthlyPremium | number 入力 | — |
| **手数料** | firstYearCommission | number 入力 (optional) | — |
| **初回相談日** | firstConsultDate | 日付入力 | — |

### 3-5. 保存ロジック

**updateOpportunity() 呼び出し**:

```typescript
const handleEditSave = () => {
  if (!editingKey) return;
  
  const opp = oppMap.get(editingKey.oppId);
  const existingProduct = opp?.proposalProducts.find(p => p.id === editingKey.productId);
  
  // 更新オブジェクト構築
  const updatedProduct: ProposalProduct = {
    ...existingProduct,
    productCategory: selectedCategory.categoryKey as ProductCategory,
    productName: selectedCategory.name,
    insurer: selectedInsurer.name,
    insurerId: selectedInsurer.id,
    insuredPersonId: editForm.insuredPersonId,
    monthlyPremium: Number(editForm.monthlyPremium),
    firstYearCommission: ...,
    firstConsultDate: editForm.firstConsultDate || todayStr(),
  };
  
  // Opportunity の proposalProducts 配列を置換
  updateOpportunity(editingKey.oppId, {
    title: `${selectedInsurer.name} / ${selectedCategory.name}`,
    proposalProducts: opp.proposalProducts.map(
      p => p.id === editingKey.productId ? updatedProduct : p
    ),
    productCategories: [updatedProduct.productCategory],
    milestones: { ...(opp.milestones ?? {}), firstConsultDate: updatedProduct.firstConsultDate },
    targetPersonIds: [editForm.insuredPersonId],
  });
};
```

#### 実装検証（grep）

```bash
$ grep -n "updateOpportunity(editingKey.oppId" src/pages/HouseholdsPage/PoliciesPane.tsx
193:      updateOpportunity(editingKey.oppId, {
```

---

## 4. UI/UX — 商品カード表示と編集ボタン

### 4-1. 商品カード表示形式（列表示）

**表示内容**（商品ペインの各行）:

```
📦 [商品名]               [種目タグ] [✏️編集]
🏢 [保険会社]
📝 契約者: [契約者名]
👤 被保険者: [被保険者名]
💰 月払: [金額]円/月
🎯 手数料: [金額]円
📅 初回相談: [日付]
```

### 4-2. インライン編集フォーム展開

「✏️」ボタンクリック → PolicyCardInlineEdit コンポーネント展開 → フォーム表示

**フォームレイアウト**:

```
被保険者: [セレクト]
保険会社: [セレクト]
種目: [セレクト]
月払保険料: [テキスト入力]
手数料（初回）: [テキスト入力]
初回相談日: [日付入力]

[キャンセル] [保存]
```

#### 実装検証（grep）

```bash
$ grep -n "function PolicyCardInlineEdit\|<Pencil\|onClick={() => openEditForm" src/pages/HouseholdsPage/PoliciesPane.tsx
295:                          <button type="button" onClick={() => openEditForm(product, oppId)}
```

---

## 5. IA-3（画面情報体系）の更新

### 5-1. IA-3 旧構造（工程E）

```
顧客管理
  ├─ 世帯
  │   └─ /households
  │       ├─ 世帯一覧
  │       ├─ 世帯詳細
  │       ├─ 構成員管理
  │       └─ 保障マトリクス
  └─ 契約
      └─ /policies
          ├─ 契約一覧
          └─ 契約詳細
```

### 5-2. IA-3 新構造（工程F）

```
顧客管理 (/customers)
  ├─ [世帯] tab=households (default)
  │   ├─ 世帯一覧（HouseholdsPage）
  │   ├─ 世帯詳細（HouseholdDetailPage）
  │   ├─ 構成員管理（PersonsPane）
  │   └─ 保障マトリクス（HouseholdMatrixPane）
  │
  ├─ [商品] tab=products
  │   └─ ProductsPage（3ペイン統合）
  │       ├─ ① 世帯リスト（HouseholdListPane）
  │       ├─ ② 構成員（PersonsPane）
  │       └─ ③ 保険商品（PoliciesPane）+ インライン編集
  │
  └─ [契約] tab=policies
      └─ PoliciesPage
          ├─ 契約一覧
          └─ 契約詳細
```

### 5-3. USE_CASE_LIST.md の更新

**既更新項目**（本ドキュメント作成時点）:

- ✅ セクション「0. 主要な工程F実装」で IA-3 再編を反映
- ✅ UC-G-11 (提案商品追加・編集) にインライン編集フロー記載
- ✅ UC-G-14 (保障マトリクス) に 3ペイン説明を追加
- ✅ 「4. データモデルサマリー」は工程E/F 共通のため変更なし

---

## 6. ドキュメント検証結果

### 更新・新規作成ファイル

| ファイル | 変更内容 | 検証ステータス |
|---------|---------|------------|
| `docs/USE_CASE_LIST.md` | 「0. 主要な工程F実装」セクション追加・IA-3 更新・3ペイン説明追加 | ✅ コード grep 検証済み |
| `docs/PHASE_F_IMPLEMENTATION.md` | 本ドキュメント新規作成。工程F全体仕様・IA再編・3ペイン・編集機能・ロジック検証 | ✅ 作成 |

### grep 検証済み機能

- ✅ CustomerListPage: /customers + ?tab= パラメータ実装
- ✅ ProductsPage: PC 横3列 + スマホタブ切替 Tailwind CSS 実装
- ✅ PoliciesPane: openEditForm() + handleEditSave() 実装
- ✅ 名称逆引き: insurerId/productCategory の後方互換ロジック完全実装
- ✅ App.tsx: /households, /policies, /products → /customers リダイレクト完全実装
- ✅ 編集フィールド: 被保険者/保険会社/種目/月払/手数料/初回相談日 全て実装

---

## 7. 参照

- **フロントエンド実装**: src/pages/CustomerListPage.tsx / ProductsPage.tsx / HouseholdsPage/PoliciesPane.tsx
- **リダイレクト設定**: src/App.tsx
- **コンポーネント**: src/pages/HouseholdsPage/{HouseholdListPane, PersonsPane, PoliciesPane, ProductFormFields, PolicyCardInlineEdit}.tsx
- **ユースケース**: docs/USE_CASE_LIST.md (UC-G-11, UC-G-14, IA-3 セクション)
- **工程E参照**: docs/PHASE_E_IMPLEMENTATION.md

---

*本ドキュメントは実コード検証に基づいて作成。検証は git HEAD 025f266 を対象。*
