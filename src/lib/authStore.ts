'use client';

import { create } from 'zustand';
import { AuthUserData } from '@/components/auth/SpaceEntranceAuth';

interface AuthState {
  user: AuthUserData | null;
  hasCheckedStorage: boolean;
  login: (user: AuthUserData) => void;
  logout: () => void;
  initializeAuth: () => void;
}

const AUTH_STORAGE_KEY = 'lunarov_space_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hasCheckedStorage: false,

  initializeAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ user: parsed, hasCheckedStorage: true });
        return;
      }
    } catch {
      // Ignore parse errors
    }
    set({ user: null, hasCheckedStorage: true });
  },

  login: (userData: AuthUserData) => {
    set({ user: userData, hasCheckedStorage: true });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      } catch (err) {
        console.warn('Failed to persist auth user:', err);
      }
    }
  },

  logout: () => {
    set({ user: null, hasCheckedStorage: true });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to remove auth user:', err);
      }
    }
  },
}));
