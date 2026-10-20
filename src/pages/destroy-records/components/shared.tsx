import { Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type {
  ConversationType,
  DestroyReason,
  DestroyReasonFilter,
} from '../../../types/admin';

/**
 * 操作人已是废弃列：后端恒不下发 operator_name。
 * 流水里不再占一列，改为在「原因」列用 Tooltip 指向真实追溯路径。
 */
export const OPERATOR_TRACE_TIP =
  '操作人可从审计日志 admin_manual_destroy_message 追溯';

/** 全站统一的空值占位：淡色 —，不渲染空 Tag */
export function EmptyValue(): React.ReactElement {
  return <span style={{ color: 'var(--text-3)' }}>—</span>;
}

/**
 * 单行文本单元格：超长省略 + 悬停全文。
 * 表格行高必须由一行文字决定，任何需要换行的长文本一律走 Tooltip。
 */
export function EllipsisText({
  value,
}: {
  value: string | null | undefined;
}): React.ReactElement {
  if (!value) return <EmptyValue />;
  return (
    <Tooltip title={value} mouseEnterDelay={0.3}>
      <span
        style={{
          display: 'block',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--text)',
        }}
      >
        {value}
      </span>
    </Tooltip>
  );
}

/**
 * 焚毁原因筛选枚举：实测后端 reason 只接受这 5 个值，传 admin_manual 会 400，
 * 故筛选项与「原因」Tag 的标签表分开维护，避免把不可查询的值塞进下拉。
 */
export const DESTROY_REASON_OPTIONS: {
  label: string;
  value: DestroyReasonFilter;
}[] = [
  { label: '兜底到期', value: 'fallback_expired' },
  { label: '阅读完成', value: 'all_read' },
  { label: '管理员手动', value: 'manual' },
  { label: '群主解散', value: 'owner_dissolve' },
  { label: '管理员解散', value: 'admin_dissolve' },
];

/** 历史数据里可能残留 admin_manual，只作为展示兜底，绝不出现在筛选下拉中 */
const LEGACY_DESTROY_REASON_LABEL: Record<string, string> = {
  admin_manual: '管理员手动',
};

const DESTROY_REASON_LABEL: Record<string, string> = {
  ...LEGACY_DESTROY_REASON_LABEL,
  ...Object.fromEntries(DESTROY_REASON_OPTIONS.map((o) => [o.value, o.label])),
};

/** 只用 AntD 语义色：阅读完成=绿、兜底到期=灰、主动手动销毁=红、解散类=橙 */
const DESTROY_REASON_COLOR: Record<string, string> = {
  all_read: 'green',
  fallback_expired: 'default',
  admin_manual: 'red',
  manual: 'red',
  owner_dissolve: 'orange',
  admin_dissolve: 'orange',
};

export const MESSAGE_TYPE_LABEL: Record<string, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  video: '视频',
  file: '文件',
};

export const CONVERSATION_TYPE_LABEL: Record<string, string> = {
  private: '私聊',
  group: '群聊',
  channel: '频道',
};

const CONVERSATION_TYPE_COLOR: Record<string, string> = {
  private: 'blue',
  group: 'geekblue',
  channel: 'purple',
};

/** 后端可能给出枚举外的原因值，此时原样展示，避免显示为空 */
export function destroyReasonLabel(
  reason: DestroyReason | string | null | undefined,
): string {
  if (!reason) return '—';
  return DESTROY_REASON_LABEL[reason] || reason;
}

export function DestroyReasonTag({
  reason,
}: {
  reason: DestroyReason | string | null | undefined;
}): React.ReactElement {
  return (
    <Tag color={DESTROY_REASON_COLOR[reason ?? ''] || 'default'}>
      {destroyReasonLabel(reason)}
    </Tag>
  );
}

/** 会话类型 Tag；后端给 null（私聊常见）时返回 null，由调用方决定是否占位 */
export function ConversationTypeTag({
  type,
}: {
  type: ConversationType | string | null | undefined;
}): React.ReactElement | null {
  if (!type) return null;
  return (
    <Tag color={CONVERSATION_TYPE_COLOR[type] || 'default'}>
      {CONVERSATION_TYPE_LABEL[type] || type}
    </Tag>
  );
}

export function destroyStageLabel(stage: string | null | undefined): string {
  if (stage === 'pending_purge') return '待真删';
  if (stage === 'destroyed') return '已焚毁';
  return '—';
}

/**
 * 阶段 Tag：stage 由后端实测下发，两个视图共用同一套渲染，
 * 让同一行在「销毁流水」与「待真删队列」中的语义保持一致。
 */
export function DestroyStageTag({
  stage,
}: {
  stage: string | null | undefined;
}): React.ReactElement {
  if (stage === 'pending_purge') {
    return <Tag color="orange">待真删</Tag>;
  }
  if (stage === 'destroyed') {
    return <Tag>已焚毁</Tag>;
  }
  return <span style={{ color: 'var(--text-3)' }}>—</span>;
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

/**
 * 时长格式化：「3 天 2 小时 15 分」，不足 60 秒直接给秒数。
 * 用于存活时长列（后端不下发 TTL，故仅此一处使用）。
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '—';
  }
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total} 秒`;
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分`);
  return parts.length > 0 ? parts.join(' ') : `${total} 秒`;
}

/** 与 AuditLog.tsx 相同的 CSV 转义：仅在必要时加引号 */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
