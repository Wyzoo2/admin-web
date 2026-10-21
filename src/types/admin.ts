// 管理端「焚毁 V6.0」数据层类型：以 2026-10-20 实测后端响应（192.168.9.105:9091）为准
// 文档先行版本的契约已失准，改类型时请以实测响应为准，不要按 ENGINEERING_ADMIN.md 回改
// 复用的基础类型（PageResult / DeviceType）保留在 ./index，此处只声明 V6.0 相关结构

import type { DeviceType } from './index';

/** 会话类型；与 GroupInfo.type 取值一致，便于管理端跨模块对照展示 */
export type ConversationType = 'private' | 'group' | 'channel';

/** 消息类型；决定前端选用哪种内容占位渲染（非文本消息不展示正文片段） */
export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file';

/** 焚毁原因全集；区分被动到期与主动销毁，便于焚毁记录页按责任方归类追责 */
export type DestroyReason =
  | 'fallback_expired'
  | 'all_read'
  | 'admin_manual'
  | 'owner_dissolve'
  | 'admin_dissolve'
  | 'manual';

/** 焚毁记录筛选可用的原因；实测后端只认这 5 个，传 admin_manual 会 400，故与枚举全集分开 */
export type DestroyReasonFilter =
  | 'fallback_expired'
  | 'all_read'
  | 'owner_dissolve'
  | 'admin_dissolve'
  | 'manual';

/** 消息管理列表项；正文只给 content_snippet 摘要，避免明文在列表接口成批外泄 */
export interface AdminMessage {
  id: string;
  conversation_id: string;
  /** 私聊会话没有会话名，后端实测给 null，前端需回退展示对方昵称 */
  conversation_name: string | null;
  conversation_type: ConversationType;
  sender_id: string;
  sender_name: string | null;
  /** 发送人手机号；实测列表已附带，运营据此定位账号，缺失时前端显示占位 */
  sender_phone?: string | null;
  type: MessageType;
  /** 正文摘要；加密或已撤回消息可能为空，列表据此判断是否需要「查看详情」 */
  content_snippet: string | null;
  /** 附件文件名；仅带附件的消息有值，列表用于区分文件类消息的展示文案 */
  file_name?: string | null;
  /** 是否带附件；实测始终下发，前端用它决定是否展示附件角标 */
  has_attachment?: boolean;
  /** 是否具备焚毁属性；与 is_destroyed 不同，表示「配置了焚毁」而非「已焚毁」 */
  is_burn?: boolean;
  /** 焚毁倒计时配置；非焚毁消息为 null，为 null 时列表不展示倒计时列 */
  burn_ttl_seconds: number | null;
  is_encrypted: boolean;
  is_recalled: boolean;
  is_destroyed: boolean;
  /** 实际焚毁时间；仅 is_destroyed 为 true 时有值 */
  destroyed_at: string | null;
  destroy_reason: DestroyReason | string | null;
  /** 计划焚毁时间点（创建时按 TTL 推算），未设置焚毁则为 null */
  destroy_at: string | null;
  created_at: string;
}

/** 消息管理列表筛选条件；布尔项用真正的 boolean，由 axios 序列化为 true/false，避免调用方各写字符串 */
export interface AdminMessageQuery {
  conversation_id?: string;
  sender_id?: string;
  type?: MessageType;
  /** 按焚毁状态过滤；不传表示两种都要 */
  is_destroyed?: boolean;
  /** 只看焚毁消息（burn_only 与 is_destroyed 语义不同：前者是「具备焚毁属性」） */
  burn_only?: boolean;
  start_time?: string;
  end_time?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** 回执汇总（兼容保留）：后端已改为数组回执，此汇总结构由前端派生，保留导出供既有页面 import */
export interface MessageReceiptSummary {
  total: number;
  read: number;
  revealed: number;
  burned: number;
}

/** 单条回执；实测详情页 receipts 是逐人数组，没有 {total,read,revealed,burned} 汇总字段 */
export interface MessageReceipt {
  user_id: string;
  display_name: string;
  is_sender: boolean;
  is_read: boolean;
  read_at: string | null;
  revealed_at: string | null;
  burn_at: string | null;
}

/** 真删墓碑；后端用 tombstone 表达「记录已被物理清理」，因此详情里没有 destroy_record 字段 */
export interface DestroyTombstone {
  destroyed_at?: string;
  destroy_reason?: string;
  [key: string]: unknown;
}

/** 消息详情；回执为数组、tombstone 为 null 表示记录仍在，非 null 表示已真删 */
export interface AdminMessageDetail {
  message: AdminMessage;
  receipts: MessageReceipt[];
  acked_count: number;
  tombstone: DestroyTombstone | null;
}

/** 管理员手动焚毁结果；already 为 true 表示此前已焚毁，页面据此提示「无需重复操作」而非报错 */
export interface AdminDestroyResult {
  success: boolean;
  already: boolean;
  message_id: string;
  destroyed_at: string;
}

/** 详情页焚毁快照（兼容保留）：已被 DestroyTombstone 取代，保留导出以免既有 import 断裂 */
export interface AdminMessageDestroyRecord {
  destroyed_at: string;
  destroy_reason: DestroyReason | string;
  operator: string | null;
}

/** 强制下线结果；device_id 回传的是设备记录主键，可用于核对前端操作的是哪条记录 */
export interface ForceOfflineResult {
  success: boolean;
  device_id: string;
  user_id: string;
}

/** 焚毁记录行；已焚毁与待真删两个视图同构，后端按 stage 字段区分，故共用一份结构 */
export interface DestroyRecord {
  stage: 'destroyed' | 'pending_purge' | string;
  message_id: string;
  conversation_id: string;
  conversation_name: string | null;
  conversation_type: ConversationType | null;
  sender_id?: string;
  sender_name: string | null;
  type: MessageType;
  created_at: string;
  destroyed_at: string;
  destroy_reason: DestroyReason | string;
  /** 实际存活秒数，由后端算好；前端不自行推算，避免客户端时钟偏差导致统计失真 */
  alive_seconds: number;
  /** 已确认的成员数；实测仅有待真删视图下发，已焚毁视图可能缺省 */
  acked_count?: number;
  /** 需达到的确认数阈值；与 acked_count 一起用于估算真删进度 */
  members_need?: number;
  /** 后端承诺的真删时间；仅待真删视图有值，用于运营监控积压 */
  will_purge_at?: string | null;
  /** 焚毁 TTL；实测两个视图都不下发，保留可选以便后端补齐后直接消费 */
  burn_ttl_seconds?: number | null;
  /** 手动销毁操作人；实测不下发，保留可选以免后端补齐时改类型 */
  operator_id?: string | null;
  operator_name?: string | null;
}

/** 待真删队列行；后端两个视图同构，保留此别名避免页面 churn */
export type PendingPurgeRecord = DestroyRecord;

/** 焚毁记录查询；reason 收窄为筛选枚举、stage 由 pendingPurge 内部固定，故不再作为查询项暴露 */
export interface DestroyRecordQuery {
  /** 传空字符串表示清空筛选，避免受控 Select 复位时发出 reason= 空值请求 */
  reason?: DestroyReasonFilter | '';
  start_time?: string;
  end_time?: string;
  conversation_id?: string;
  page?: number;
  pageSize?: number;
}

/** 待真删队列查询（兼容保留）：该队列已由后端锁定 stage=pending_purge，故只需时间/会话维度筛选 */
export interface PendingPurgeQuery {
  start_time?: string;
  end_time?: string;
  conversation_id?: string;
  page?: number;
  pageSize?: number;
}

/** 会话已读统计中的单个成员；unread_count 与 read_rate 都由后端算好，前端不做成员数推导 */
export interface ReadStatsMember {
  user_id: string;
  display_name: string;
  phone?: string | null;
  /** 会话内角色；实测下发，用于区分群主/管理员的阅读责任 */
  role?: string;
  joined_at?: string | null;
  /** 最后读到的消息 id；为 null 表示从未读过 */
  last_read_message_id: string | null;
  read_count: number;
  unread_count: number;
  /** 已读率；实测后端直接给 0~1 的比值，前端不再自行相除 */
  read_rate: number;
}

/** 单条消息的已读率（兼容保留）：实测会话统计不再下发此序列，保留导出供既有页面 import */
export interface MessageReadRate {
  message_id: string;
  created_at: string;
  read: number;
  total: number;
}

/** 会话已读统计；实测只有成员维度与消息总数，没有 member_count / message_read_rate 汇总字段 */
export interface ConversationReadStats {
  conversation_id: string;
  conversation_type: ConversationType | null;
  /** 会话消息总数；替代原 member_count 图表口径，作为阅读率分母来源 */
  message_total: number;
  members: ReadStatsMember[];
}

/** 单条消息的读者明细；revealed_at / burn_at 记录「查看即焚」链路，可判断读者是否已触发倒计时 */
export interface MessageReader {
  user_id: string;
  display_name: string;
  /** 该读者是否为发送者；实测下发，发送者自身通常不计入已读 */
  is_sender?: boolean;
  is_read: boolean;
  read_at: string | null;
  revealed_at: string | null;
  burn_at: string | null;
}

/** 消息已读统计；实测没有 burned 字段，焚毁进度改由 is_destroyed + readers 推导 */
export interface MessageReadStats {
  message_id: string;
  is_destroyed: boolean;
  total: number;
  revealed: number;
  read: number;
  readers: MessageReader[];
}

/** 在线监控概览；字段以实测响应为准，可选字段在缺失时页面按占位展示而非崩坏 */
export interface PresenceOverview {
  online_users: number;
  online_devices: number;
  /** 设备记录总数；用于和在线数对比判断离线规模 */
  total_devices?: number;
  /** 按设备类型拆分的在线数；实测是数组而非 map，后端新增类型时无需改前端 */
  online_by_type?: { device_type: DeviceType; count: number }[];
  /** 在线判定 TTL；页面据此说明「超过该时长未心跳视为离线」 */
  online_ttl_seconds?: number;
  /** 已过期但仍标记在线的设备数；用于提示心跳异常 */
  stale_online_devices?: number;
}

/** 在线设备行；id 才是设备记录主键（强制下线要用它），device_fingerprint 仅用于展示与日志 */
export interface PresenceDevice {
  id: string;
  user_id: string;
  display_name?: string | null;
  phone?: string | null;
  device_name: string;
  device_type: DeviceType;
  device_fingerprint?: string | null;
  is_online: boolean;
  /** 同设备并存的长连接数；>1 常意味着客户端多开或重连未回收，是排查重点 */
  socket_count?: number;
  online_at?: string | null;
  offline_at?: string | null;
  last_active_at: string | null;
  created_at?: string;
}

/** 在线设备查询；device_type 允许空字符串以便 Select 清空后仍保持受控 */
export interface PresenceDeviceQuery {
  online_only?: boolean;
  device_type?: DeviceType | '';
  /** 服务端按手机号/昵称过滤（v2.6.0 起支持，前端不再本地过滤） */
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 用户级在线视图（GET /presence/online，v2.6.0）。
 * 后端已按用户聚合，前端不再自行把设备列表 group by user_id。
 */
export interface OnlineUserView {
  id: string;
  phone: string;
  display_name: string | null;
  avatar_url?: string | null;
  signature?: string | null;
  department?: string | null;
  is_online: boolean;
  /** 该用户当前在线设备数（>0 即在线） */
  online_devices: number;
  /** 该用户所有设备中最近一次活跃时间 */
  last_active_at: string | null;
}

export interface OnlineUserQuery {
  /** 按手机号/昵称过滤（服务端） */
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 焚毁概览（GET /admin/stats/burn-overview，v2.6.0）。
 * 数据总览页专用：原因分布、平均存活时长等均由后端算好，前端不再聚合销毁流水。
 */
export interface BurnOverview {
  today_destroyed: number;
  destroy_reason_today: { reason: string; count: number }[];
  avg_alive_seconds_today: number | null;
  active_burn_messages: number;
  pending_purge: number;
  purged_total: number;
}

/** 焚毁保留策略；阈值由后端定时任务直接消费，前端只做展示与提交，不在本地换算以免与后端漂移 */
export interface RetentionSettings {
  /** 焚毁后等待确认的回退天数 */
  ack_fallback_days: number;
  /** 触发真删的确认数阈值 */
  purge_ack_threshold: number;
  /** 未确认时的焚毁回退小时数 */
  burn_fallback_hours: number;
  /** 在线状态 TTL（秒） */
  online_ttl_seconds: number;
  /** 是否允许页面提交修改；实测为 false，页面应据此只读而非隐藏表单 */
  editable?: boolean;
  /** 服务端说明（如「由环境变量控制，修改后需重启」），直接透传展示以免前端自撰文案 */
  note?: string | null;
}

/** 保留策略的局部更新体；只提交被修改的字段，未提交项由后端保持原值 */
export type RetentionSettingsPatch = Partial<RetentionSettings>;
