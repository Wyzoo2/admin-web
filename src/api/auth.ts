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
};
