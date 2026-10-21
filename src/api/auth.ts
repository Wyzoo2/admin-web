import request from './request';
import type {
  DeviceType,
  LoginResponse,
  RefreshTokenResponse,
  SafeUser,
} from '../types';

export interface LoginBody {
  phone: string;
  password: string;
  device_name: string;
  device_type: DeviceType;
}

export interface ChangePasswordBody {
  old_password: string;
  new_password: string;
}

export interface HeartbeatResult {
  server_time: string;
  /** 后端在线判定 TTL（秒），超过该时长未心跳即视为离线 */
  online_ttl: number;
}

export const authApi = {
  /** 手机号 + 密码登录，签发 token 对并登记设备 */
  login: (body: LoginBody) =>
    request.post<unknown, LoginResponse>('/auth/login', body),

  /** 获取本人资料 */
  profile: () => request.get<unknown, SafeUser>('/auth/profile'),

  /** 修改本人密码（首登强制改密走此接口） */
  changePassword: (body: ChangePasswordBody) =>
    request.post<unknown, null>('/auth/change-password', body),

  /** 用 refresh_token 换新 token 对 */
  refreshToken: (refresh_token: string) =>
    request.post<unknown, RefreshTokenResponse>('/auth/refresh-token', {
      refresh_token,
    }),

  /**
   * 设备心跳：刷新该设备的 last_active_at 并保持在线。
   *
   * 后端对「在线」的判定是「WS 已连接」或「last_active_at 在 ONLINE_TTL_SECONDS(默认 150s) 内」；
   * 管理后台没有 WS 长连接，若不发心跳，登录 150 秒后就会被判定离线、最后活跃时间也不再变化。
   * 入参是设备**记录 id**（登录响应的 device.id），不是设备指纹。
   */
  heartbeat: (deviceRecordId: string) =>
    request.post<unknown, HeartbeatResult>(
      `/auth/devices/${deviceRecordId}/heartbeat`,
      {},
    ),
};
