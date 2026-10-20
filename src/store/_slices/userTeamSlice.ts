// =====================================================
// User + Team slice
// =====================================================
import type { StateCreator } from "zustand";
import type { AppState, User, Team } from "../_internal/types";
import { uid } from "../_internal/constants";

export const createUserTeamSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "addUser"
    | "updateUser"
    | "deactivateUser"
    | "addTeam"
    | "updateTeam"
    | "deleteTeam"
  >
> = (set) => ({
  addUser: (user) => {
    const newUser: User = { ...user, id: uid() };
    set((s) => ({ users: [...s.users, newUser] }));
    return newUser;
  },

  updateUser: (userId, updates) => {
    set((s) => ({
      users: s.users.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
    }));
  },

  deactivateUser: (userId) => {
    set((s) => ({
      users: s.users.map((u) =>
        u.id === userId ? { ...u, status: "inactive" } : u,
      ),
    }));
  },

  addTeam: (team) => {
    const newTeam: Team = { ...team, id: uid() };
    set((s) => ({ teams: [...s.teams, newTeam] }));
    return newTeam;
  },

  updateTeam: (teamId, updates) => {
    set((s) => ({
      teams: s.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)),
    }));
  },

  deleteTeam: (teamId) => {
    set((s) => ({ teams: s.teams.filter((t) => t.id !== teamId) }));
  },
});
