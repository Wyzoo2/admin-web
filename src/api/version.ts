import request from './request';
import type {
  AppVersion,
  PageResult,
  VersionPatchBody,
  VersionPublishBody,
} from '../types';

export const versionApi = {
  /** 版本管理列表（仅 admin，分页，version_code 倒序混排） */
  list: (params?: { page?: number; pageSize?: number }) =>
    request.get<unknown, PageResult<AppVersion>>('/app-versions/manage', {
      params,
    }),

  /** 发布新版本（multipart：APK 文件 + 版本元信息） */
  publish: (body: VersionPublishBody) => {
    const fd = new FormData();
    fd.append('file', body.file);
    fd.append('version_name', body.version_name);
    fd.append('version_code', String(body.version_code));
    if (body.platform) fd.append('platform', body.platform);
    if (body.force !== undefined) fd.append('force', String(body.force));
    if (body.notes) fd.append('notes', body.notes);
    return request.post<unknown, AppVersion>('/app-versions', fd);
  },

  /** 修改版本（撤回 / 恢复发布 / 强更开关 / 更新说明） */
  patch: (id: string, body: VersionPatchBody) =>
    request.patch<unknown, AppVersion>(`/app-versions/${id}`, body),

  /** 删除版本记录（磁盘 APK 保留） */
  remove: (id: string) =>
    request.delete<unknown, null>(`/app-versions/${id}`),
};
