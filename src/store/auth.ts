import { create } from 'zustand';
import { authApi, LoginBody } from '../api/auth';
import { tokenStore } from '../api/request';
import type { LoginResponse, SafeUser } from '../types';

const USER_KEY = 'burnmsg_user';
const DEVICE_ID_KEY = 'burnmsg_device_id';

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
  /**
   * 当前登录设备的指纹（登录响应的 device.device_id）。
   * 仅用于在线监控判断「这一行是不是本机」，从而禁止下线自己。
   */
  deviceId: string | null;
  login: (body: LoginBody) => Promise<LoginResponse>;
  logout: () => void;
  setUser: (u: SafeUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  deviceId: localStorage.getItem(DEVICE_ID_KEY),

  login: async (body) => {
    const res = await authApi.login(body);
    tokenStore.set(res.access_token, res.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(DEVICE_ID_KEY, res.device.device_id);
    set({ user: res.user, deviceId: res.device.device_id });
    return res;
  },

  logout: () => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
    set({ user: null, deviceId: null });
  },

  setUser: (u) => {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    set({ user: u });
  },
}));
