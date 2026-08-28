import request from './request';
import type {
  Announcement,
  AnnouncementCreateBody,
  PageResult,
} from '../types';

export const announcementApi = {
  /** 管理端公告列表（分页，含 read_count） */
  list: (params?: { page?: number; pageSize?: number }) =>
    request.get<unknown, PageResult<Announcement>>('/announcements/manage', {
      params,
    }),

  /** 发布公告（仅 admin） */
  create: (body: AnnouncementCreateBody) =>
    request.post<unknown, Announcement>('/announcements', body),

  /** 删除公告 */
  remove: (id: string) =>
    request.delete<unknown, null>(`/announcements/${id}`),
};
