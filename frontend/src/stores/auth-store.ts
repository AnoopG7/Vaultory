import { create } from "zustand";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: User | null, token: string | null) => void;
  setUser: (user: User | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("vaultory_token"),
  isAuthenticated: Boolean(localStorage.getItem("vaultory_token")),

  setSession: (user, token) => {
    if (token) localStorage.setItem("vaultory_token", token);
    else localStorage.removeItem("vaultory_token");
    set({ user, token, isAuthenticated: Boolean(token) });
  },

  setUser: (user) => set({ user }),

  clearSession: () => {
    localStorage.removeItem("vaultory_token");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
