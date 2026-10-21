import { Alert, Button, Empty } from 'antd';
import dayjs from 'dayjs';

/** 空值占位：淡色破折号，避免占位符和真实内容抢注意力（与 IdText 的空值样式一致） */
export const Dash = () => <span style={{ color: 'var(--text-3)' }}>—</span>;

/** 统一时间显示：空值回退为破折号，避免表格出现空白单元格 */
export const formatTime = (value: string | null | undefined): string =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';

/** 已读率百分比；total 为 0 时按 0 处理，防止 NaN 传入 Progress */
export const readRatePercent = (read: number, total: number): number =>
  total > 0 ? Math.round((read / total) * 100) : 0;

/** 后端直接下发的 0~1 已读率转百分比；越界值夹到 0~100，防止脏数据撑坏进度条 */
export const ratioToPercent = (ratio: number | null | undefined): number => {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return 0;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
};

/** 会话类型中文名；后端可能给出枚举外的值，此时原样展示 */
export const CONVERSATION_TYPE_LABEL: Record<string, string> = {
  private: '私聊',
  group: '群聊',
  channel: '频道',
};

export const conversationTypeLabel = (
  type: string | null | undefined,
): string => {
  if (!type) return '—';
  return CONVERSATION_TYPE_LABEL[type] || type;
};

/**
 * 已读率配色档位：100% 绿、≥50% 用主题默认色、<50% 橙。
 * 取 AntD 语义色名而非 hex，深色主题下依然可读，也不与主题变量冲突。
 */
export const readRateStroke = (percent: number): string | undefined => {
  if (percent >= 100) return 'green';
  if (percent >= 50) return undefined;
  return 'orange';
};

/** 查询失败：保留错误文案与重试按钮，不白屏 */
export const QueryErrorAlert = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <Alert
    type="error"
    showIcon
    message="查询失败"
    description={error}
    action={
      <Button size="small" onClick={onRetry}>
        重试
      </Button>
    }
  />
);

/** 未发起查询 / 无数据时的紧凑占位：只有一行说明 + 小图，不撑出整屏空白 */
export const QueryEmptyHint = ({ description }: { description: string }) => (
  <div style={{ padding: '24px 0' }}>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {description}
        </span>
      }
    />
  </div>
);
