import type { BlockType } from "../../../types";
import { DAY_START, HOUR_PX, SNAP, STORAGE_KEY } from "./constants";

export function minuteToY(min: number): number {
  return ((min - DAY_START) / 60) * HOUR_PX;
}

export function yToMinute(y: number, containerTop: number): number {
  const relY = y - containerTop;
  const raw = DAY_START + (relY / HOUR_PX) * 60;
  return Math.round(raw / SNAP) * SNAP;
}

export function getLastChip(): BlockType | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as BlockType | null;
  } catch {
    return null;
  }
}

export function saveLastChip(t: BlockType) {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* noop */
  }
}

/** 仮ブロックの時間範囲を "HH:MM - HH:MM ⏱Xh Ym" でフォーマット */
export function formatRange(startMin: number, endMin: number): string {
  const dur = endMin - startMin;
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const fmt = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const durStr = h > 0 && m > 0 ? `${h}h${m}m` : h > 0 ? `${h}h` : `${m}m`;
  return `${fmt(startMin)} - ${fmt(endMin)} ⏱${durStr}`;
}
