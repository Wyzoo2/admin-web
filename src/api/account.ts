import request from './request';
import type {
  AccountCreateBody,
  AccountListQuery,
  BatchAccountItem,
  BatchResult,
  CreatedAccount,
  PageResult,
  ResetPasswordResult,
  SafeUser,
  UserStatus,
} from '../types';

export const accountApi = {
  /** 账号分页列表：keyword 模糊匹配手机号/姓名，department 部门过滤，status 状态过滤 */
  list: (params: AccountListQuery) =>
    request.get<unknown, PageResult<SafeUser>>('/accounts', { params }),

  /** 账号详情 */
  detail: (id: string) => request.get<unknown, SafeUser>(`/accounts/${id}`),

  /** 部门去重列表 */
  departments: () => request.get<unknown, string[]>('/accounts/departments'),

  /** 开通单个账号；password 留空自动生成随机密码并在响应中返回一次 */
  create: (body: AccountCreateBody) =>
    request.post<unknown, CreatedAccount>('/accounts', body),

  /** JSON 批量开通账号（1~500 条） */
  batchCreate: (accounts: BatchAccountItem[]) =>
    request.post<unknown, BatchResult>('/accounts/batch', { accounts }),

  /** Excel 批量导入账号（xlsx，最大 5MB） */
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request.post<unknown, BatchResult>('/accounts/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** 重置指定账号密码；留空自动生成随机密码并在响应中返回一次 */
  resetPassword: (id: string, new_password?: string) =>
    request.post<unknown, ResetPasswordResult>(
      `/accounts/${id}/reset-password`,
      new_password ? { new_password } : {},
    ),

  /** 启用/停用账号；停用时删除该账号全部设备记录（全端强制下线） */
  toggleStatus: (id: string, status: UserStatus) =>
    request.post<unknown, null>(`/accounts/${id}/toggle-status`, { status }),
};
