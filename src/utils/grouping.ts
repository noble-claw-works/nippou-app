/**
 * grouping.ts — 世帯>契約者 2段グルーピングユーティリティ
 *
 * C-1: 商談一覧・契約一覧を世帯(Household) > 契約者(Person) の2段に束ねる
 * 純粋関数のみ。React/Zustand に非依存。単体テスト可能。
 *
 * 設計判断:
 * - contractorPersonId が未設定の案件/契約は「契約者未設定」グループへ集約
 * - headPersonId フォールバックは「契約者未設定」には使わない
 *   (実データとしては未設定を未設定のまま表示し、ユーザーが気づける設計)
 * - グループ内の並び順は呼び出し元のソート済み配列をそのまま保持
 *
 * @module
 */

// ─── 定数 ────────────────────────────────────────────
export const UNSET_CONTRACTOR_ID = '__unset__';
export const UNSET_CONTRACTOR_NAME = '契約者未設定';

// ─── 型 ─────────────────────────────────────────────

/** 契約者ごとのグループ（第2段） */
export interface ContractorGroup<T> {
  contractorPersonId: string;  // UNSET_CONTRACTOR_ID の場合は未設定
  contractorName: string;
  items: T[];
}

/** 世帯ごとのグループ（第1段） */
export interface HouseholdGroup<T> {
  householdId: string;
  householdName: string;
  /** 配下の全 items（件数表示用。contractorGroups のすべての items のフラット） */
  totalCount: number;
  contractorGroups: ContractorGroup<T>[];
}

// ─── 依存型（汎用） ──────────────────────────────────

/** グルーピング対象アイテムが持つべき最小インターフェイス */
export interface GroupableItem {
  householdId: string;
  contractorPersonId?: string | null;
}

/** 世帯マスタの最小インターフェイス */
export interface HouseholdRef {
  id: string;
  name: string;
}

/** 契約者マスタの最小インターフェイス */
export interface PersonRef {
  id: string;
  name: string;
  householdId: string;
}

// ─── メイン関数 ──────────────────────────────────────

/**
 * フィルタ/ソート済みのアイテム配列を「世帯 > 契約者」2段ネスト構造へ変換する。
 *
 * @param items      フィルタ・ソート済みアイテム列
 * @param households 世帯マスタ(名前解決用)
 * @param persons    契約者候補マスタ(名前解決用)
 * @returns HouseholdGroup の配列（世帯の出現順は items 内の最初の登場順）
 */
export function groupByHouseholdThenContractor<T extends GroupableItem>(
  items: T[],
  households: HouseholdRef[],
  persons: PersonRef[],
): HouseholdGroup<T>[] {
  // householdId → HouseholdGroup のマップ（登場順保持のため Map を使用）
  const householdMap = new Map<string, HouseholdGroup<T>>();
  // householdId → (contractorPersonId → ContractorGroup) のマップ
  const contractorMap = new Map<string, Map<string, ContractorGroup<T>>>();

  const resolveHouseholdName = (householdId: string): string =>
    households.find(h => h.id === householdId)?.name ?? householdId;

  const resolveContractorName = (contractorPersonId: string | null | undefined): string => {
    if (!contractorPersonId) return UNSET_CONTRACTOR_NAME;
    return persons.find(p => p.id === contractorPersonId)?.name ?? UNSET_CONTRACTOR_NAME;
  };

  const resolveContractorKey = (contractorPersonId: string | null | undefined): string =>
    contractorPersonId ?? UNSET_CONTRACTOR_ID;

  for (const item of items) {
    const hid = item.householdId;
    const cid = resolveContractorKey(item.contractorPersonId);

    // 世帯グループを初期化（初回登場時）
    if (!householdMap.has(hid)) {
      householdMap.set(hid, {
        householdId: hid,
        householdName: resolveHouseholdName(hid),
        totalCount: 0,
        contractorGroups: [],
      });
      contractorMap.set(hid, new Map());
    }

    const householdGroup = householdMap.get(hid)!;
    const cGroups = contractorMap.get(hid)!;

    // 契約者グループを初期化（初回登場時）
    if (!cGroups.has(cid)) {
      const contractorGroup: ContractorGroup<T> = {
        contractorPersonId: cid,
        contractorName: resolveContractorName(item.contractorPersonId),
        items: [],
      };
      cGroups.set(cid, contractorGroup);
      householdGroup.contractorGroups.push(contractorGroup);
    }

    cGroups.get(cid)!.items.push(item);
    householdGroup.totalCount++;
  }

  return Array.from(householdMap.values());
}
