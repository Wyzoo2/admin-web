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

// ============ 审计日志 ============

export type AuditAction =
  | 'login'
  | 'change_password'
  | 'create_account'
  | 'batch_import_accounts'
  | 'reset_password'
  | 'enable_account'
  | 'disable_account'
  | 'remove_device';

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_display_name: string | null;
  user_phone: string | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  user_id?: string;
  action?: string;
  target_type?: string;
  start_time?: string;
  end_time?: string;
  keyword?: string;
}

// ============ Dashboard 统计 ============

export interface StorageInfo {
  upload_bytes: number;
  upload_files: number;
  db_bytes: number;
  total_bytes: number;
}

export interface StatsOverview {
  total_users: number;
  disabled_users: number;
  deleted_users: number;
  today_active_users: number;
  today_messages: number;
  total_messages: number;
  total_conversations: number;
  total_groups: number;
  online_devices: number;
  storage: StorageInfo;
  generated_at: string;
}

// ============ 群组/频道 ============

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: GroupRole;
  muted?: boolean;
  joined_at: string;
  user_display_name?: string;
  user_avatar_url?: string | null;
  user_phone?: string;
  user_department?: string | null;
}

export interface GroupInfo {
  id: string;
  type: 'private' | 'group' | 'channel';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  owner_id: string | null;
  is_channel: boolean;
  member_count: number;
  last_message_at: string | null;
  dissolved_at: string | null;
  dissolved_by: string | null;
  created_at: string;
  updated_at: string;
  /** 管理端列表补充字段 */
  owner_display_name?: string;
  owner_phone?: string;
  is_dissolved?: boolean;
}

export interface GroupCreateBody {
  name: string;
  description?: string;
  is_channel?: boolean;
  member_ids?: string[];
}

export interface GroupUpdateBody {
  name?: string;
  description?: string;
  avatar_url?: string;
}

// ============ 系统公告 ============

export type AnnouncementPriority = 'normal' | 'urgent';
export type AnnouncementTarget = 'all' | 'department';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_type: AnnouncementTarget;
  target_departments: string[] | null;
  created_by: string;
  read_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementCreateBody {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  target_type?: AnnouncementTarget;
  target_departments?: string[];
}

// ============ 意见反馈 ============

export type FeedbackStatus = 'pending' | 'processed';

export interface FeedbackItem {
  id: string;
  user_id: string;
  content: string;
  contact: string | null;
  status: FeedbackStatus;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
  updated_at: string;
  /** 管理端补充字段 */
  user_display_name?: string;
  user_department?: string | null;
}

export interface FeedbackListQuery {
  page?: number;
  pageSize?: number;
  status?: FeedbackStatus;
}
