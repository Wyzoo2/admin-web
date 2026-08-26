// 与后端 API v2.0.0（NestJS + TypeORM + MySQL）对齐的类型定义

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'disabled';
export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'web';

export interface SafeUser {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  signature: string | null;
  department: string | null;
  role: UserRole;
  status: UserStatus;
  force_change_pwd: boolean;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_name: string;
  device_type: DeviceType;
  device_id: string;
  is_online: boolean;
  last_active_at: string | null;
  created_at: string;
}

export interface LoginResponse {
  user: SafeUser;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  device: Device;
  force_change_pwd: boolean;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface PageResult<T> {
  data: T[];
  total: number;
}

export interface AccountCreateBody {
  phone: string;
  display_name: string;
  department?: string;
  password?: string;
}

export interface CreatedAccount extends SafeUser {
  initial_password?: string;
}

export interface BatchAccountItem {
  phone: string;
  display_name: string;
  department?: string;
}

// 批量开通 / Excel 导入结果（后端返回成功/失败明细，结构做宽松兼容）
export interface BatchResultItem {
  phone?: string;
  display_name?: string;
  success?: boolean;
  reason?: string;
  message?: string;
  initial_password?: string;
  password?: string;
  [key: string]: unknown;
}

export interface BatchResult {
  success_count?: number;
  fail_count?: number;
  success?: BatchResultItem[];
  fail?: BatchResultItem[];
  results?: BatchResultItem[];
  [key: string]: unknown;
}

export interface ResetPasswordResult {
  new_password?: string;
  [key: string]: unknown;
}

export interface AccountListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  department?: string;
  status?: UserStatus;
}
