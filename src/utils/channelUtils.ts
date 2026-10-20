// =====================================================
// チャネル導出ヘルパー — Phase B-1
// 設計書 §4 / §7 準拠 (2026-07-08)
// =====================================================
import type { SalesChannel } from '../types';

/**
 * チャネルIDから [親, 子] のパスを返す。
 * - channelId が親(parentId=null)を指す場合は [親] のみ返す。
 * - 見つからない場合は [] を返す。
 *
 * @example
 *   getChannelPath('ch_agency_shinjuku', SALES_CHANNELS)
 *   // => [{ id: 'ch_agency', ... }, { id: 'ch_agency_shinjuku', ... }]
 */
export function getChannelPath(
  channelId: string | null | undefined,
  channels: SalesChannel[]
): SalesChannel[] {
  if (!channelId) return [];

  const leaf = channels.find((ch) => ch.id === channelId);
  if (!leaf) return [];

  if (leaf.parentId === null) {
    // 親自身を指している（運用上は子必須だが型上は許容）
    return [leaf];
  }

  const parent = channels.find((ch) => ch.id === leaf.parentId);
  if (!parent) return [leaf];

  return [parent, leaf];
}

/**
 * 指定した親IDの子チャネル一覧を返す。
 * アクティブなものに限定するオプション付き（既定: activeOnly=false）。
 */
export function getChannelChildren(
  parentId: string,
  channels: SalesChannel[],
  activeOnly = false
): SalesChannel[] {
  return channels
    .filter(
      (ch) =>
        ch.parentId === parentId &&
        (!activeOnly || ch.isActive)
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * チャネルの表示名を返す。
 * - 子チャネルの場合: "親名 / 子名"
 * - 親チャネルの場合: "親名"
 * - 未設定/不明の場合: fallback（既定: '―'）
 */
export function getChannelDisplayName(
  channelId: string | null | undefined,
  channels: SalesChannel[],
  fallback = '―'
): string {
  const path = getChannelPath(channelId, channels);
  if (path.length === 0) return fallback;
  return path.map((ch) => ch.name).join(' / ');
}

/**
 * チャネルIDが有効な葉(子)ノードを指しているか検証する。
 * §9確定: Opportunity.channelId は葉(子)必須。親のみ選択は不可。
 */
export function isLeafChannel(
  channelId: string | null | undefined,
  channels: SalesChannel[]
): boolean {
  if (!channelId) return false;
  const ch = channels.find((c) => c.id === channelId);
  if (!ch) return false;
  return ch.parentId !== null; // parentId に値があれば葉
}
