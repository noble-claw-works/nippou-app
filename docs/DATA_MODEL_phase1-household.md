## 保険営業ドメイン Phase 1: 世帯モデル基盤

**コミット**: `6db6e91 feat(household): Phase 1 — 世帯モデル基盤 (Household + Person 2 階層) 導入`

保険営業における「世帯」単位での顧客管理を実現するため、`Customer` を `Household` に発展させ、世帯員を表す `Person` 型を新設した。

### Household 型（旧 Customer の発展形）

`Customer` 型は `Household` の互換エイリアスとして残存しており、既存コードを壊さない。ただし将来的に `Customer` 型は deprecated となる予定。

```typescript
interface Household {
  id: string;
  name: string;              // 例: 「田中家」「ABC商事」
  type: HouseholdType;       // 'individual' | 'corporate' | 'prospect'
  area: string;
  primaryUserId: string;     // 担当者 ID
  headPersonId?: string;     // 世帯主 Person.id (個人世帯のみ意味あり)
  address?: string;
  familyMemo: string;        // 家族構成メモ
  tags: string[];
  memo: string;
  status: HouseholdStatus;   // 'active' | 'inactive'
  lastContactDate?: string;  // YYYY-MM-DD
  nextAppointment?: string;  // YYYY-MM-DD
  isFavorite?: boolean;
}

// 互換エイリアス — 既存コードを壊さない (deprecated 予告)
export type Customer = Household;
```

**既存コードとの互換性**: `CustomerType` / `CustomerStatus` 型は `HouseholdType` / `HouseholdStatus` の型エイリアスとして維持される。

---

### Person 型（世帯員）

```typescript
export type PersonRelation = 'head' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
export type PersonGender = 'M' | 'F' | 'other';

interface Person {
  id: string;
  householdId: string;       // 所属世帯 (Household.id)
  name: string;              // 氏名
  kana?: string;             // 氏名かな
  relation: PersonRelation;  // 続柄
  birthDate?: string;        // YYYY-MM-DD
  gender?: PersonGender;     // 'M' | 'F' | 'other'
  occupation?: string;       // 職業
  smoker?: boolean;          // 喫煙有無
  healthNotes?: string;      // 健康上の備考
  memo: string;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}
```

**PersonRelation の選択肢**:

| 値 | 意味 |
|---|---|
| `head` | 世帯主 |
| `spouse` | 配偶者 |
| `child` | 子 |
| `parent` | 親 |
| `sibling` | 兄弟姉妹 |
| `other` | その他 (法人担当者など) |

---

### Household と Person のリレーション

```
Household (1)
  id: "c1"
  headPersonId: "p_c1_head"  ← 世帯主への参照
      │
      ▼
Person (N)
  { id: "p_c1_head",   householdId: "c1", relation: "head"   }
  { id: "p_c1_spouse", householdId: "c1", relation: "spouse" }
  { id: "p_c1_child1", householdId: "c1", relation: "child"  }
  { id: "p_c1_child2", householdId: "c1", relation: "child"  }
```

**世帯主削除時の自動繰り上げ**: `deletePerson(personId)` で `relation === 'head'` の Person を削除する際、同世帯に他の Person がいれば先頭の Person が自動的に世帯主 (`relation: 'head'`) に繰り上げられる。

---

### LocalStorage 永続化

`persons` 配列は store の初期状態として `PERSONS` seed データから生成される。現時点では `nippou.persons.v1` のような専用キーは持たないが、他のエンティティと同様に将来的な永続化対象となる予定。

---

### Store Actions: Person 操作

| アクション | 説明 |
|---|---|
| `addPerson(householdId, partial)` | 世帯員追加（id / householdId / createdAt / updatedAt は自動付与） |
| `updatePerson(personId, patch)` | 世帯員更新（updatedAt を自動更新） |
| `deletePerson(personId)` | 世帯員削除。世帯主削除時は自動繰り上げ。`{ ok: boolean; error?: string }` を返す |
| `getPersonsByHousehold(householdId)` | 世帯 ID で世帯員一覧を取得 |

---

### Seed データ: PERSONS

c1〜c10 の世帯主および家族 18 件がデフォルト seed として登録される。

| 世帯 | 世帯主 | 家族構成 |
|---|---|---|
| c1 KOORO GILSON | p_c1_head | 世帯主 + 配偶者 + 子 2 名 |
| c2 齋藤 和久 | p_c2_head | 世帯主 + 配偶者 + 子 1 名 |
| c3 暁和化学ゴム (法人) | p_c3_head | 担当者 (relation: other) |
| c4 水野 幸重 | p_c4_head | 世帯主のみ |
| c5 山田工業 (法人) | p_c5_head | 担当者 (relation: other) |
| c6 鈴木 花代 | p_c6_head | 世帯主 + 子 3 名 |
| c7 テクノ精工 (法人) | p_c7_head | 担当者 (relation: other) |
| c8 高橋 誠 | p_c8_head | 世帯主のみ |
| c9 大鉄工業 (法人, inactive) | p_c9_head | 担当者 (relation: other) |
| c10 伊藤 幸子 | p_c10_head | 世帯主のみ |

**法人世帯の扱い**: `type === 'corporate'` の世帯は Person の `relation` に `'other'` を使い、担当者（代表取締役など）を登録する。法人世帯は `Household` として引き続き存続する。

---

