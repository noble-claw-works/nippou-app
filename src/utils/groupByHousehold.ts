/**
 * groupByHousehold — 世帯1段グループ化の純粋関数
 *
 * 商談一覧・契約一覧で「世帯ごとの1段グループ化」を行う。
 * 契約者は第2段のグループにはせず、各行の属性として表示するのみ。
 *
 * 設計方針 (主上確定 2026-07-12 C-2):
 *   - 世帯グループ自体の並び: 世帯名昇順 (localeCompare ja)
 *   - 世帯内の案件/契約の並び: 呼び出し側が決定する（ソート済みリストをそのままグルーピング）
 */

/** 世帯グループ1件 */
export interface HouseholdGroup<T> {
  householdId: string;
  householdName: string;
  items: T[];
}

/**
 * フィルタ後リストを世帯でグループ化して返す。
 *
 * @param items - フィルタ・ソート済みの案件/契約リスト
 * @param getHouseholdId - アイテムから世帯IDを取得
 * @param getHouseholdName - 世帯IDから世帯名を取得
 * @returns 世帯名昇順でソートされた世帯グループ配列
 */
export function groupByHousehold<T>(
  items: T[],
  getHouseholdId: (item: T) => string,
  getHouseholdName: (householdId: string) => string,
): HouseholdGroup<T>[] {
  // 世帯ごとに集約（世帯内の順序は引数のitems順を維持）
  const map = new Map<string, HouseholdGroup<T>>();

  for (const item of items) {
    const hid = getHouseholdId(item);
    if (!map.has(hid)) {
      map.set(hid, {
        householdId: hid,
        householdName: getHouseholdName(hid),
        items: [],
      });
    }
    map.get(hid)!.items.push(item);
  }

  // 世帯名昇順
  return Array.from(map.values()).sort((a, b) =>
    a.householdName.localeCompare(b.householdName, 'ja'),
  );
}
