import { useEffect } from 'react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';

/** 心跳间隔：后端 ONLINE_TTL_SECONDS 默认 150s，60s 一次留足两次容错 */
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * 设备心跳（ONLINE_PRESENCE §5.1 / §7）。
 *
 * 后端的在线判定是「WS 已连接」或「last_active_at 在 TTL 内」，而管理后台没有 WS 长连接：
 * 不发心跳的话，登录 150 秒后就会被判成离线，且「最后活跃」永远停在登录那一刻。
 *
 * 规则与 App 端保持一致：前台每 60s 一次；切回前台立即补一次，后台不发。
 */
export function useHeartbeat(): void {
  const deviceRecordId = useAuthStore((s) => s.deviceRecordId);

  useEffect(() => {
    if (!deviceRecordId) return undefined;

    const beat = () => {
      if (document.hidden) return;
      // 失败静默：心跳不应干扰页面主流程（401 由 request 拦截器统一处理）
      void authApi.heartbeat(deviceRecordId).catch(() => undefined);
    };

    beat();
    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [deviceRecordId]);
}
