// =====================================================
// user.ts — ユーザー / チーム型
// =====================================================

import type { Role, UserStatus } from "./core";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamIds: string[];
  status: UserStatus;
  lastLogin?: string;
  avatarInitials: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  managerIds: string[];
  memberIds: string[];
}
