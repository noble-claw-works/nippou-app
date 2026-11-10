import type { BlockType } from "../../../types";

export const DAY_START = 6 * 60; // 6:00
export const DAY_END = 22 * 60 + 30; // 22:30
export const HOUR_PX = 64;
export const SNAP = 15;

export const BLOCK_TYPES: BlockType[] = [
  "visit",
  "office",
  "phone",
  "travel",
  "break",
  "meeting",
  "lunch",
];

export const HOTKEYS: Record<string, BlockType> = {
  "1": "visit",
  "2": "office",
  "3": "phone",
  "4": "travel",
  "5": "break",
  "6": "meeting",
  "7": "lunch",
};

export const STORAGE_KEY = "nippou_last_chip";
