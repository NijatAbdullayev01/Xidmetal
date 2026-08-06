import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@xidmetal/shared';

interface AuthState {
  user: UserProfile | null;
  /** Cookie sessiyası aktivdir (token localStorage-da saxlanmır) */
  session: boolean;
  setAuth: (user: UserProfile) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: false,
      setAuth: (user) => set({ user, session: true }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, session: false }),
      isAuthenticated: () => get().session && !!get().user,
    }),
    {
      name: 'xidmetal-auth-v2',
      partialize: (state) => ({ user: state.user, session: state.session }),
    },
  ),
);
