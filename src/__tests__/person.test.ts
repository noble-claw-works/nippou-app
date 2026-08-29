// person.test.ts — Person CRUD / 世帯主繰り上げロジック テスト (Phase 1)
import { describe, it, expect } from 'vitest';
import type { Person, PersonRelation } from '../types';

// ─── Person ファクトリ ─────────────────────────────────────────────
let _id = 0;
const uid = () => `p${++_id}`;
const now = new Date().toISOString();

function makePerson(over: Partial<Person> = {}): Person {
  return {
    id: uid(),
    householdId: 'h1',
    name: 'テスト太郎',
    relation: 'head',
    memo: '',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

// ─── ミニストア (テスト用) ─────────────────────────────────────────
function createStore(initial: Person[] = []) {
  let persons = [...initial];
  let households: { id: string; headPersonId?: string }[] = [{ id: 'h1' }, { id: 'h2' }];

  const getPersonsByHousehold = (householdId: string) =>
    persons.filter(p => p.householdId === householdId);

  const addPerson = (householdId: string, partial: Omit<Person, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>): Person => {
    const p: Person = { ...partial, id: uid(), householdId, createdAt: now, updatedAt: now };
    persons = [...persons, p];
    return p;
  };

  const updatePerson = (personId: string, patch: Partial<Person>) => {
    persons = persons.map(p => p.id === personId ? { ...p, ...patch, updatedAt: now } : p);
  };

  const deletePerson = (personId: string): { ok: boolean; error?: string } => {
    const person = persons.find(p => p.id === personId);
    if (!person) return { ok: false, error: '世帯員が見つかりません' };
    if (person.relation === 'head') {
      const siblings = persons.filter(p => p.householdId === person.householdId && p.id !== personId);
      if (siblings.length > 0) {
        const next = siblings[0];
        persons = persons
          .filter(p => p.id !== personId)
          .map(p => p.id === next.id ? { ...p, relation: 'head' as PersonRelation, updatedAt: now } : p);
        households = households.map(h =>
          h.id === person.householdId ? { ...h, headPersonId: next.id } : h
        );
      } else {
        persons = persons.filter(p => p.id !== personId);
        households = households.map(h =>
          h.id === person.householdId ? { ...h, headPersonId: undefined } : h
        );
      }
    } else {
      persons = persons.filter(p => p.id !== personId);
    }
    return { ok: true };
  };

  return { getPersonsByHousehold, addPerson, updatePerson, deletePerson, getPersons: () => persons, getHouseholds: () => households };
}

// ─── テスト ─────────────────────────────────────────────────────────

describe('addPerson', () => {
  it('世帯員を追加できる', () => {
    const store = createStore();
    const p = store.addPerson('h1', { name: '田中 太郎', relation: 'head', memo: '' });
    expect(p.name).toBe('田中 太郎');
    expect(p.householdId).toBe('h1');
    expect(p.relation).toBe('head');
    expect(store.getPersonsByHousehold('h1')).toHaveLength(1);
  });

  it('複数の世帯員を追加できる', () => {
    const store = createStore();
    store.addPerson('h1', { name: '田中 太郎', relation: 'head', memo: '' });
    store.addPerson('h1', { name: '田中 花子', relation: 'spouse', memo: '' });
    store.addPerson('h1', { name: '田中 一郎', relation: 'child', memo: '' });
    expect(store.getPersonsByHousehold('h1')).toHaveLength(3);
  });
});

describe('updatePerson', () => {
  it('世帯員を更新できる', () => {
    const head = makePerson({ name: '山田 太郎' });
    const store = createStore([head]);
    store.updatePerson(head.id, { name: '山田 太郎（更新後）', occupation: '自営業' });
    const updated = store.getPersons().find(p => p.id === head.id);
    expect(updated?.name).toBe('山田 太郎（更新後）');
    expect(updated?.occupation).toBe('自営業');
  });
});

describe('deletePerson', () => {
  it('通常世帯員を削除できる', () => {
    const head = makePerson({ relation: 'head' });
    const spouse = makePerson({ relation: 'spouse', name: '配偶者' });
    const store = createStore([head, spouse]);
    const result = store.deletePerson(spouse.id);
    expect(result.ok).toBe(true);
    expect(store.getPersonsByHousehold('h1')).toHaveLength(1);
  });

  it('存在しない世帯員の削除はエラーを返す', () => {
    const store = createStore([]);
    const result = store.deletePerson('nonexistent');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('世帯主削除時に次の世帯員が世帯主に繰り上がる', () => {
    const head = makePerson({ relation: 'head', name: '世帯主' });
    const spouse = makePerson({ relation: 'spouse', name: '配偶者' });
    const store = createStore([head, spouse]);
    const result = store.deletePerson(head.id);
    expect(result.ok).toBe(true);
    const remaining = store.getPersonsByHousehold('h1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].relation).toBe('head');
    expect(remaining[0].name).toBe('配偶者');
  });

  it('最後の世帯員（世帯主）を削除すると世帯員0になる', () => {
    const head = makePerson({ relation: 'head', name: '一人暮らし' });
    const store = createStore([head]);
    const result = store.deletePerson(head.id);
    expect(result.ok).toBe(true);
    expect(store.getPersonsByHousehold('h1')).toHaveLength(0);
  });
});

describe('getPersonsByHousehold', () => {
  it('世帯IDでフィルタリングできる', () => {
    const p1 = makePerson({ householdId: 'h1', name: 'H1の人' });
    const p2 = makePerson({ householdId: 'h2', name: 'H2の人' });
    const p3 = makePerson({ householdId: 'h1', name: 'H1の人2' });
    const store = createStore([p1, p2, p3]);
    expect(store.getPersonsByHousehold('h1')).toHaveLength(2);
    expect(store.getPersonsByHousehold('h2')).toHaveLength(1);
    expect(store.getPersonsByHousehold('h3')).toHaveLength(0);
  });
});
