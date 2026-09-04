import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'http://47.114.38.126:9091/api/v1';

const ACCESS_KEY = 'burnmsg_access_token';
const REFRESH_KEY = 'burnmsg_refresh_token';

export const tokenStore = {
  get access(): string {
    return localStorage.getItem(ACCESS_KEY) || '';
  },
  get refresh(): string {
    return localStorage.getItem(REFRESH_KEY) || '';
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const request = axios.create({ baseURL: BASE_URL, timeout: 30000 });

request.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  __retry?: boolean;
}

let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const rt = tokenStore.refresh;
  if (!rt) throw new Error('no refresh token');
  const res = await axios.post(`${BASE_URL}/auth/refresh-token`, {
    refresh_token: rt,
  });
  const body = res.data;
  if (!body || body.code !== 0) {
    throw new Error(body?.message || '刷新令牌失败');
  }
  tokenStore.set(body.data.access_token, body.data.refresh_token);
  return body.data.access_token as string;
}

function extractMessage(error: AxiosError<{ message?: unknown }>): string {
  const msg = error.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg) return msg;
  return error.message || '网络异常';
}

request.interceptors.response.use(
  (res: AxiosResponse): any => {
    const body = res.data;
    // 统一响应格式：{ code: 0, message, data }
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data;
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return body;
  },
  async (error: AxiosError<{ message?: unknown }>) => {
    const { response, config } = error;
    const cfg = config as RetryConfig | undefined;
    const isAuthApi = !!cfg?.url && cfg.url.includes('/auth/');

    // 401 且非认证接口：尝试用 refresh_token 静默换新 token 后重试一次
    if (response?.status === 401 && cfg && !cfg.__retry && !isAuthApi) {
      cfg.__retry = true;
      try {
        refreshing = refreshing ?? doRefresh().finally(() => { refreshing = null; });
        await refreshing;
        return request(cfg);
      } catch {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }
    }
    return Promise.reject(new Error(extractMessage(error)));
  },
);

export default request;
