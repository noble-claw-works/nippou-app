// =====================================================
// renewalRoadmapTemplateSlice — Doc5 ロードマップ テンプレ版管理（§2.5 / PC-5）
// localStorage: nippou.renewalRoadmapTemplate.v1
// 発行(publish)は manager のみ（isAdmin assert）。発行済み版は不変、末尾が最新。
// =====================================================
import type { StateCreator } from "zustand";
import type {
  AppState,
  RenewalRoadmapItemDef,
  RenewalRoadmapTemplateVersion,
} from "../_internal/types";
import { isAdmin } from "../../utils/roles";

const STORAGE_KEY = "nippou.renewalRoadmapTemplate.v1";

function persist(versions: RenewalRoadmapTemplateVersion[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
    }
  } catch {
    /* ignore */
  }
}

export const createRenewalRoadmapTemplateSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "getCurrentRoadmapTemplate"
    | "getRoadmapTemplateVersion"
    | "publishRoadmapTemplate"
  >
> = (set, get) => ({
  /** 最新版（version 最大）を返す。無ければ undefined */
  getCurrentRoadmapTemplate: () => {
    const versions = get().roadmapTemplateVersions;
    if (!versions || versions.length === 0) return undefined;
    return versions.reduce((latest, v) =>
      v.version > latest.version ? v : latest,
    );
  },

  /** 指定版を返す。無ければ undefined */
  getRoadmapTemplateVersion: (version) => {
    return get().roadmapTemplateVersions.find((v) => v.version === version);
  },

  /**
   * 新しいテンプレ版を発行（manager のみ）。
   * - 権限が無ければ throw（§2.5 publish[manager必須assert]）
   * - version = 現在の最大 + 1。発行後は不変。
   */
  publishRoadmapTemplate: (items: RenewalRoadmapItemDef[], userId: string) => {
    const state = get();
    if (!isAdmin(state.currentRole)) {
      throw new Error(
        "publishRoadmapTemplate: 管理者(manager)権限が必要です",
      );
    }
    const versions = state.roadmapTemplateVersions ?? [];
    const nextVersion =
      versions.reduce((max, v) => Math.max(max, v.version), 0) + 1;

    const newVersion: RenewalRoadmapTemplateVersion = {
      version: nextVersion,
      items: items.map((i) => ({ ...i })),
      editedByUserId: userId,
      editedAt: new Date().toISOString(),
    };

    const updated = [...versions, newVersion];
    set({ roadmapTemplateVersions: updated });
    persist(updated);
    return newVersion;
  },
});
