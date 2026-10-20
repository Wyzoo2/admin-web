import request from './request';
import type { PageResult } from '../types';
import type {
  AdminDestroyResult,
  AdminMessage,
  AdminMessageDetail,
  AdminMessageQuery,
  ConversationReadStats,
  DestroyRecord,
  DestroyRecordQuery,
  ForceOfflineResult,
  MessageReadStats,
  PendingPurgeQuery,
  PendingPurgeRecord,
  PresenceDevice,
  PresenceDeviceQuery,
  PresenceOverview,
  RetentionSettings,
  RetentionSettingsPatch,
} from '../types/admin';

// 焚毁 V6.0 管理端接口（全部要求 admin 权限）。
// request 的响应拦截器已把 {code,message,data} 拆为 data，故第二泛型直接写业务返回类型。
// 返回类型一律按 2026-10-20 实测响应标注，不按文档先行版本标注。

export const adminMessageApi = {
  /** 消息管理列表（分页）；支持会话/发送人/类型/焚毁状态/时间区间/关键词过滤 */
  list: (params: AdminMessageQuery) =>
    request.get<unknown, PageResult<AdminMessage>>('/admin/messages', { params }),

  /** 消息详情；实测返回 { message, receipts[], acked_count, tombstone }，回执是逐人数组 */
  detail: (id: string) =>
    request.get<unknown, AdminMessageDetail>(`/admin/messages/${id}`),

  /** 管理员手动焚毁单条消息；reason 固定回传 admin_manual 以便审计区分责任方，already=true 表示此前已焚毁 */
  destroy: (id: string, reason = 'admin_manual') =>
    request.post<unknown, AdminDestroyResult>(`/admin/messages/${id}/destroy`, {
      reason,
    }),
};

export const destroyRecordApi = {
  /** 焚毁记录列表（分页）；reason 仅接受 DestroyReasonFilter 内的值，传 admin_manual 后端会 400 */
  list: (params: DestroyRecordQuery) =>
    request.get<unknown, PageResult<DestroyRecord>>('/admin/destroy-records', {
      params,
    }),

  /** 待真删队列；与 list 同路径同构，靠内部固定的 stage=pending_purge 切换视图 */
  pendingPurge: (params: PendingPurgeQuery) =>
    request.get<unknown, PageResult<PendingPurgeRecord>>(
      '/admin/destroy-records',
      { params: { ...params, stage: 'pending_purge' } },
    ),
};

export const readStatsApi = {
  /** 会话维度已读统计；实测只给 message_total + 成员阅读率，没有 member_count 汇总 */
  conversation: (id: string) =>
    request.get<unknown, ConversationReadStats>(
      `/admin/read-stats/conversations/${id}`,
    ),

  /** 单条消息已读统计；readers 含每个人的已读/解锁/焚毁时间点，且没有 burned 计数 */
  message: (id: string) =>
    request.get<unknown, MessageReadStats>(`/admin/read-stats/messages/${id}`),
};

export const presenceApi = {
  /** 在线监控概览；实测给 online_by_type 数组与 online_ttl_seconds，页面按实测字段消费 */
  overview: () =>
    request.get<unknown, PresenceOverview>('/admin/presence/overview'),

  /** 在线设备列表（分页）；默认仅在线，online_only=false 可查看离线设备 */
  devices: (params: PresenceDeviceQuery) =>
    request.get<unknown, PageResult<PresenceDevice>>('/admin/presence/devices', {
      params,
    }),

  /** 强制指定设备下线；路径参数是设备记录 id（PresenceDevice.id），不是 device_fingerprint */
  forceOffline: (deviceRecordId: string) =>
    request.post<unknown, ForceOfflineResult>(
      `/admin/devices/${deviceRecordId}/offline`,
    ),
};

export const retentionApi = {
  /** 读取焚毁保留策略；实测附带 editable/note，页面应在 editable !== true 时按只读渲染 */
  get: () =>
    request.get<unknown, RetentionSettings>('/admin/settings/retention'),

  /** 更新保留策略：后端当前未实现 PUT（实测 404），保留签名供 editable 打开后直接启用 */
  update: (patch: RetentionSettingsPatch) =>
    request.put<unknown, { success: boolean }>(
      '/admin/settings/retention',
      patch,
    ),
};
