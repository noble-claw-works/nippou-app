// =====================================================
// シードデータ — ユーザー / チーム
// =====================================================
import type { User, Team } from "../../types";
import { today, d } from "./helpers";

export const USERS: User[] = [
  {
    id: "u1",
    name: "霧島 遥",
    email: "kirishima@example.com",
    role: "general",
    teamIds: ["t1"],
    status: "active",
    lastLogin: `${today}T09:01:00`,
    avatarInitials: "霧",
  },
  {
    id: "u2",
    name: "田中 太郎",
    email: "tanaka@example.com",
    role: "general",
    teamIds: ["t2"],
    status: "active",
    lastLogin: `${today}T08:45:00`,
    avatarInitials: "田",
  },
  {
    id: "u3",
    name: "山田 花子",
    email: "yamada@example.com",
    role: "general",
    teamIds: ["t1"],
    status: "active",
    lastLogin: d(1) + "T17:30:00",
    avatarInitials: "山",
  },
  {
    id: "u4",
    name: "佐藤 健一",
    email: "sato@example.com",
    role: "manager",
    teamIds: ["t1"],
    status: "active",
    lastLogin: `${today}T08:55:00`,
    avatarInitials: "佐",
  },
  {
    id: "u5",
    name: "鈴木 美咲",
    email: "suzuki@example.com",
    role: "executive",
    teamIds: [],
    status: "active",
    lastLogin: `${today}T09:10:00`,
    avatarInitials: "鈴",
  },
  {
    id: "u6",
    name: "高田 一郎",
    email: "takada@example.com",
    role: "admin",
    teamIds: [],
    status: "active",
    lastLogin: d(2) + "T10:00:00",
    avatarInitials: "高",
  },
];

// =====================================================
// チーム
// =====================================================

export const TEAMS: Team[] = [
  {
    id: "t1",
    name: "営業1課",
    description: "袋井・磐田エリア担当",
    managerIds: ["u4"],
    memberIds: ["u1", "u3", "u4"],
  },
  {
    id: "t2",
    name: "営業2課",
    description: "浜松エリア担当",
    managerIds: [],
    memberIds: ["u2"],
  },
];

// =====================================================
// 世帯 (Household / Customer alias)
// =====================================================
