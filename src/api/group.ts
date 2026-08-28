import request from './request';
import type {
  GroupCreateBody,
  GroupInfo,
  GroupMember,
  GroupUpdateBody,
  PageResult,
} from '../types';

export const groupApi = {
  /** 全量群组管理列表（分页，仅 admin） */
  list: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    include_dissolved?: 'true';
  }) =>
    request.get<unknown, PageResult<GroupInfo>>('/groups/admin/all', {
      params,
    }),

  /** 创建群组/频道 */
  create: (body: GroupCreateBody) =>
    request.post<unknown, GroupInfo>('/groups', body),

  /** 修改群资料 */
  update: (id: string, body: GroupUpdateBody) =>
    request.put<unknown, GroupInfo>(`/groups/${id}`, body),

  /** 群成员列表 */
  members: (id: string) =>
    request.get<unknown, GroupMember[]>(`/groups/${id}/members`),

  /** 添加成员 */
  addMembers: (id: string, userIds: string[]) =>
    request.post<unknown, null>(`/groups/${id}/members`, {
      member_ids: userIds,
    }),

  /** 移除成员 */
  removeMember: (id: string, userId: string) =>
    request.delete<unknown, null>(`/groups/${id}/members/${userId}`),

  /** 设置成员角色 admin/member（仅群主） */
  setMemberRole: (id: string, userId: string, role: 'admin' | 'member') =>
    request.put<unknown, null>(`/groups/${id}/members/${userId}/role`, { role }),

  /** 管理员强制解散群组（留痕，消息保留） */
  dissolve: (id: string) =>
    request.delete<unknown, null>(`/groups/admin/${id}`),
};
