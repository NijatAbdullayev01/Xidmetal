import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, AuthTokens } from '@xidmetal/shared';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  setAuth: (user: UserProfile, tokens: AuthTokens) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      setAuth: (user, tokens) => set({ user, tokens }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, tokens: null }),
      isAuthenticated: () => !!get().tokens?.accessToken,
    }),
    { name: 'xidmetal-auth' },
  ),
);
