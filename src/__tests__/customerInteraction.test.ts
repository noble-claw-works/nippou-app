// customerInteraction.test.ts — CustomerInteraction slice + util テスト
import { describe, it, expect, beforeEach } from "vitest";
import type {
  CustomerInteraction,
  InteractionKind,
} from "../types/customerInteraction";
import { INTERACTION_KIND_LABEL } from "../types/customerInteraction";

// =====================================================
// INTERACTION_KIND_LABEL util テスト
// =====================================================
describe("INTERACTION_KIND_LABEL", () => {
  it("各 InteractionKind に対応するラベルがある", () => {
    const kinds: InteractionKind[] = [
      "phone",
      "reception",
      "visit",
      "email",
      "other",
    ];
    for (const kind of kinds) {
      expect(INTERACTION_KIND_LABEL[kind]).toBeTruthy();
    }
  });

  it("phone=電話連絡 / reception=接客 / visit=訪問 / email=メール / other=その他", () => {
    expect(INTERACTION_KIND_LABEL.phone).toBe("電話連絡");
    expect(INTERACTION_KIND_LABEL.reception).toBe("接客");
    expect(INTERACTION_KIND_LABEL.visit).toBe("訪問");
    expect(INTERACTION_KIND_LABEL.email).toBe("メール");
    expect(INTERACTION_KIND_LABEL.other).toBe("その他");
  });
});

// =====================================================
// Slice ロジック (純粋関数として切り出しテスト)
// =====================================================

/** スライス相当のロジックを純粋関数として切り出す */
function makeUid() {
  let n = 0;
  return () => `test_id_${++n}`;
}

interface SliceState {
  customerInteractions: CustomerInteraction[];
  currentUserId: string;
}

function makeSlice(initialState: SliceState) {
  const uid = makeUid();
  const lsData: Record<string, string> = {};
  const ls = {
    setItem: (k: string, v: string) => {
      lsData[k] = v;
    },
    getItem: (k: string) => lsData[k] ?? null,
  };

  let state = { ...initialState };

  function addInteraction(
    partial: Omit<
      CustomerInteraction,
      "id" | "createdAt" | "updatedAt" | "byUserId"
    > &
      Partial<Pick<CustomerInteraction, "byUserId">>,
  ): CustomerInteraction {
    const now = new Date().toISOString();
    const interaction: CustomerInteraction = {
      ...partial,
      id: uid(),
      byUserId: partial.byUserId ?? state.currentUserId,
      createdAt: now,
      updatedAt: now,
    };
    state = {
      ...state,
      customerInteractions: [...state.customerInteractions, interaction],
    };
    ls.setItem(
      "nippou.customerInteractions.v1",
      JSON.stringify(state.customerInteractions),
    );
    return interaction;
  }

  function getByHousehold(householdId: string): CustomerInteraction[] {
    return state.customerInteractions
      .filter((i) => i.householdId === householdId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  function updateInteraction(
    id: string,
    patch: Partial<Omit<CustomerInteraction, "id" | "createdAt">>,
  ) {
    const now = new Date().toISOString();
    state = {
      ...state,
      customerInteractions: state.customerInteractions.map((i) =>
        i.id === id ? { ...i, ...patch, updatedAt: now } : i,
      ),
    };
    ls.setItem(
      "nippou.customerInteractions.v1",
      JSON.stringify(state.customerInteractions),
    );
  }

  function deleteInteraction(id: string) {
    state = {
      ...state,
      customerInteractions: state.customerInteractions.filter(
        (i) => i.id !== id,
      ),
    };
    ls.setItem(
      "nippou.customerInteractions.v1",
      JSON.stringify(state.customerInteractions),
    );
  }

  return {
    addInteraction,
    getByHousehold,
    updateInteraction,
    deleteInteraction,
    getState: () => state,
    getLS: () => lsData,
  };
}

describe("customerInteraction slice ロジック", () => {
  let slice: ReturnType<typeof makeSlice>;

  beforeEach(() => {
    slice = makeSlice({ customerInteractions: [], currentUserId: "u1" });
  });

  it("addInteraction: id / createdAt / updatedAt が付与される", () => {
    const result = slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "電話連絡テスト",
    });
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
  });

  it("addInteraction: byUserId 省略時は currentUserId が使われる", () => {
    const result = slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "テスト",
    });
    expect(result.byUserId).toBe("u1");
  });

  it("addInteraction: byUserId 明示指定が優先される", () => {
    const result = slice.addInteraction({
      householdId: "c1",
      kind: "reception",
      occurredAt: "2026-09-09",
      summary: "テスト",
      byUserId: "u2",
    });
    expect(result.byUserId).toBe("u2");
  });

  it("addInteraction: localStorage に永続化される", () => {
    slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "永続化テスト",
    });
    const ls = slice.getLS();
    const stored = JSON.parse(
      ls["nippou.customerInteractions.v1"],
    ) as CustomerInteraction[];
    expect(stored).toHaveLength(1);
    expect(stored[0].summary).toBe("永続化テスト");
  });

  it("getByHousehold: 対象世帯のみ返す", () => {
    slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-08",
      summary: "c1のもの",
    });
    slice.addInteraction({
      householdId: "c2",
      kind: "email",
      occurredAt: "2026-09-09",
      summary: "c2のもの",
    });
    const result = slice.getByHousehold("c1");
    expect(result).toHaveLength(1);
    expect(result[0].householdId).toBe("c1");
  });

  it("getByHousehold: occurredAt 降順で返す", () => {
    slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-01",
      summary: "古い",
    });
    slice.addInteraction({
      householdId: "c1",
      kind: "reception",
      occurredAt: "2026-09-09",
      summary: "新しい",
    });
    slice.addInteraction({
      householdId: "c1",
      kind: "visit",
      occurredAt: "2026-09-05",
      summary: "中間",
    });
    const result = slice.getByHousehold("c1");
    expect(result.map((r) => r.summary)).toEqual(["新しい", "中間", "古い"]);
  });

  it("getByHousehold: 0件のとき空配列", () => {
    const result = slice.getByHousehold("c99");
    expect(result).toHaveLength(0);
  });

  it("updateInteraction: 指定フィールドのみ更新される", () => {
    const interaction = slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "元の内容",
    });
    slice.updateInteraction(interaction.id, { summary: "更新後の内容" });
    const updated = slice.getByHousehold("c1")[0];
    expect(updated.summary).toBe("更新後の内容");
    expect(updated.kind).toBe("phone"); // 変えていない
  });

  it("deleteInteraction: 削除後は getByHousehold で返らない", () => {
    const i = slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "削除対象",
    });
    slice.deleteInteraction(i.id);
    expect(slice.getByHousehold("c1")).toHaveLength(0);
  });

  it("deleteInteraction: localStorage から削除される", () => {
    const i = slice.addInteraction({
      householdId: "c1",
      kind: "phone",
      occurredAt: "2026-09-09",
      summary: "削除テスト",
    });
    slice.deleteInteraction(i.id);
    const ls = slice.getLS();
    const stored = JSON.parse(
      ls["nippou.customerInteractions.v1"],
    ) as CustomerInteraction[];
    expect(stored).toHaveLength(0);
  });
});

// =====================================================
// lastContactDate 更新ロジック（純粋）
// =====================================================
describe("lastContactDate 更新ロジック", () => {
  it("occurredAt が既存 lastContactDate より新しい場合は更新する", () => {
    const lastContactDate = "2026-08-01";
    const newOccurredAt = "2026-09-09";
    const shouldUpdate = !lastContactDate || newOccurredAt > lastContactDate;
    expect(shouldUpdate).toBe(true);
  });

  it("occurredAt が既存 lastContactDate より古い場合は更新しない", () => {
    const lastContactDate = "2026-09-09";
    const newOccurredAt = "2026-08-01";
    const shouldUpdate = !lastContactDate || newOccurredAt > lastContactDate;
    expect(shouldUpdate).toBe(false);
  });

  it("lastContactDate が未設定のとき必ず更新する", () => {
    const lastContactDate = undefined;
    const newOccurredAt = "2026-09-09";
    const shouldUpdate = !lastContactDate || newOccurredAt > lastContactDate;
    expect(shouldUpdate).toBe(true);
  });
});
