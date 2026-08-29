// =====================================================
// template.ts — テンプレート / クイックチップ型
// =====================================================

import type { BlockType } from "./core";

export interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  status: "draft" | "published";
  isDefault: boolean;
  isActive: boolean;
  blocks: TemplateBlock[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlock {
  id: string;
  type:
    | "single_line"
    | "multi_line"
    | "timeline"
    | "todo"
    | "customer"
    | "radio"
    | "yn"
    | "number"
    | "attachment";
  label: string;
  required: boolean;
  order: number;
  config?: Record<string, unknown>;
}

export interface QuickChip {
  id: string;
  userId: string;
  label: string;
  emoji: string;
  blockType: BlockType;
  order: number;
}
