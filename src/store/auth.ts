import { create } from 'zustand';
import { authApi, LoginBody } from '../api/auth';
import { tokenStore } from '../api/request';
import type { LoginResponse, SafeUser } from '../types';

const USER_KEY = 'burnmsg_user';

function loadUser(): SafeUser | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? (JSON.parse(s) as SafeUser) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: SafeUser | null;
  login: (body: LoginBody) => Promise<LoginResponse>;
  logout: () => void;
  setUser: (u: SafeUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),

  login: async (body) => {
    const res = await authApi.login(body);
    tokenStore.set(res.access_token, res.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    set({ user: res.user });
    return res;
  },

  logout: () => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },

  setUser: (u) => {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    set({ user: u });
  },
}));
