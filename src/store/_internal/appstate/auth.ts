// =====================================================
// appstate/auth.ts — Auth & User slice of AppState
// =====================================================
import type { User, Team, Role } from "../../../types";
import type { AuthSession } from "../../auth";
import type { EmailChangeRequest } from "../exportedTypes";

export interface AppStateAuthSlice {
  // Auth
  currentRole: Role;
  currentUserId: string;
  authSession: AuthSession | null;
  passwords: Record<string, string>;

  // Data
  users: User[];
  teams: Team[];
  emailChangeRequests: EmailChangeRequest[];

  // Actions: Role
  setRole: (role: Role) => void;

  // Actions: Auth
  login: (
    email: string,
    password: string,
  ) => { ok: true; user: User } | { ok: false; error: string };
  loginAsUser: (userId: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  touchSession: () => void;
  changePassword: (
    userId: string,
    current: string,
    next: string,
  ) => { ok: true } | { ok: false; error: string };

  // Actions: User
  addUser: (user: Omit<User, "id">) => User;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deactivateUser: (userId: string) => void;

  // Actions: Team
  addTeam: (team: Omit<Team, "id">) => Team;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  deleteTeam: (teamId: string) => void;

  // Actions: Email Change Request
  requestEmailChange: (userId: string, newEmail: string) => void;
  getEmailChangeRequest: (userId: string) => EmailChangeRequest | undefined;
}
