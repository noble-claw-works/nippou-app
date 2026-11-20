// =====================================================
// addedHouseholds.ts — 画面で追加した世帯・構成員の永続化（D1）
// customers / persons は seed 固定で永続化されず、新規世帯はリロードで消えて
// 案件詳細の見出しに内部 ID が出ていた。seed に無いものだけ localStorage に保存し、読み込み時に merge する。
// SEED_VERSION には触れない（テスターデータ保護）。
// =====================================================
import type { Customer, Person } from "../types";

export const ADDED_HOUSEHOLDS_KEY = "nippou.addedHouseholds.v1";

interface Stored {
  customers: Customer[];
  persons: Person[];
}

export function loadAddedHouseholds(): Stored {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(ADDED_HOUSEHOLDS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Stored>;
        return {
          customers: Array.isArray(p.customers) ? p.customers : [],
          persons: Array.isArray(p.persons) ? p.persons : [],
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { customers: [], persons: [] };
}

/** seed に無い項目だけを抜き出す */
export function pickAdded(
  customers: Customer[],
  persons: Person[],
  seedCustomers: Customer[],
  seedPersons: Person[],
): Stored {
  const sc = new Set(seedCustomers.map((c) => c.id));
  const sp = new Set(seedPersons.map((p) => p.id));
  return {
    customers: customers.filter((c) => !sc.has(c.id)),
    persons: persons.filter((p) => !sp.has(p.id)),
  };
}

export function saveAddedHouseholds(added: Stored): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(ADDED_HOUSEHOLDS_KEY, JSON.stringify(added));
    }
  } catch {
    /* ignore */
  }
}

/** seed + 保存済み追加分を id で重複排除して結合（冪等） */
export function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const have = new Set(base.map((x) => x.id));
  const add = extra.filter((x) => !have.has(x.id));
  return add.length ? [...base, ...add] : base;
}
