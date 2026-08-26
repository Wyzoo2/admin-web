import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'burnmsg_theme';

function readInitial(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY);
  if (v === 'dark' || v === 'light') return v;
  // 首次访问跟随系统偏好
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyDom(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

// 模块加载时立即同步一次 DOM，避免首屏闪烁
applyDom(readInitial());

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readInitial(),
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyDom(next);
    set({ mode: next });
  },
  setMode: (m) => {
    localStorage.setItem(THEME_KEY, m);
    applyDom(m);
    set({ mode: m });
  },
}));
