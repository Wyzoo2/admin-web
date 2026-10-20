import { useEffect, useState } from 'react';
import {
  App,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import IdText from '../../../components/IdText';
import { adminMessageApi } from '../../../api/admin';
import type {
  AdminMessageDetail,
  ConversationType,
  DestroyReason,
  MessageReceipt,
} from '../../../types/admin';

/* ------------------------------------------------------------------
   字典与格式化：详情抽屉与列表页共用。
   统一在本文件导出并由列表页单向引入，避免两个文件互相 import 成环。
   ------------------------------------------------------------------ */

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

/** 只用 AntD 内置语义色：私聊=默认、群聊=蓝、频道=紫 */
const CONVERSATION_TYPE_COLOR: Record<string, string> = {
  private: 'default',
  group: 'blue',
  channel: 'purple',
};

/** 焚毁原因文案；枚举外的值原样展示，避免显示为空 */
const DESTROY_REASON_LABEL: Record<string, string> = {
  fallback_expired: '兜底到期',
  all_read: '阅读完成',
  admin_manual: '管理员手动',
  owner_dissolve: '群主解散',
  admin_dissolve: '管理员解散',
  manual: '管理员手动',
};

/** 统一时间格式；空值统一渲染破折号 */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
}

/** 单元格内的单行时间：空值走统一淡色占位，不要把两种「—」混在一列里 */
function DateTimeText({ value }: { value?: string | null }) {
  if (!value) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {dayjs(value).format('YYYY-MM-DD HH:mm:ss')}
    </span>
  );
}

export function destroyReasonLabel(
  reason: DestroyReason | string | null | undefined,
): string {
  if (!reason) return '—';
  return DESTROY_REASON_LABEL[reason] || reason;
}

/** 真删墓碑的键名文案；未知键原样展示，避免后端补字段时前端丢信息 */
const TOMBSTONE_KEY_LABEL: Record<string, string> = {
  destroyed_at: '真删时间',
  destroy_reason: '真删原因',
  purged_at: '真删时间',
  message_id: '消息 ID',
  conversation_id: '会话 ID',
  acked_count: '确认人数',
  reason: '原因',
};

/** 墓碑取值为宽松对象：按已知键决定格式，其余按键名退化渲染 */
function renderTombstoneValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span style={mutedStyle}>—</span>;
  }
  // 墓碑里的消息/会话/发送人 ID 同样是整段 UUID，窄格里会折行
  if (key.endsWith('_id')) {
    return <IdText value={String(value)} />;
  }
  if (key === 'destroy_reason' || key === 'reason') {
    return destroyReasonLabel(String(value));
  }
  if (key.endsWith('_at') || key.endsWith('_time')) {
    return formatDateTime(String(value));
  }
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * 回执汇总由逐人数组派生：后端 receipts 是数组，没有 total/read/revealed/burned 汇总字段。
 * 已焚毁按「个人焚毁时刻已到」判定，未到时刻算作倒计时中，不计入已焚毁。
 */
function summarizeReceipts(receipts: MessageReceipt[]) {
  const now = Date.now();
  return {
    total: receipts.length,
    read: receipts.filter((r) => r.is_read).length,
    revealed: receipts.filter((r) => r.revealed_at != null).length,
    burned: receipts.filter(
      (r) => r.burn_at != null && new Date(r.burn_at).getTime() <= now,
    ).length,
  };
}

/** 回执明细列；与汇总同源，逐人核对谁已读、谁已点开、谁的个人倒计时已到期 */
const RECEIPT_COLUMNS: ColumnsType<MessageReceipt> = [
  {
    title: '成员',
    dataIndex: 'display_name',
    render: (v: string, r) => (
      <Space size={4}>
        {v ? (
          <Tooltip title={`用户 ID：${r.user_id}`} mouseEnterDelay={0.3}>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
              }}
            >
              {v}
            </span>
          </Tooltip>
        ) : (
          <IdText value={r.user_id} />
        )}
        {r.is_sender ? (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            发送方
          </Tag>
        ) : null}
      </Space>
    ),
  },
  {
    title: '已读',
    dataIndex: 'is_read',
    width: 88,
    render: (v: boolean) =>
      v ? <Tag color="green">已读</Tag> : <Tag color="default">未读</Tag>,
  },
  {
    title: '已读时间',
    dataIndex: 'read_at',
    width: 160,
    render: (v: string | null) => <DateTimeText value={v} />,
  },
  {
    title: '点开时间',
    dataIndex: 'revealed_at',
    width: 160,
    render: (v: string | null) =>
      v ? <DateTimeText value={v} /> : <span style={mutedStyle}>未点开</span>,
  },
  {
    title: '个人焚毁时刻',
    dataIndex: 'burn_at',
    width: 160,
    render: (v: string | null) => <DateTimeText value={v} />,
  },
];

/**
 * 焚毁 TTL 人类可读化：能整除时给出整单位（7 天 / 5 分钟），
 * 否则逐级拆成「天 小时 分钟」。非焚毁消息由调用方单独渲染「非焚毁」。
 */
export function formatBurnTtl(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '非焚毁';
  }
  const total = Math.max(0, Math.floor(seconds));
  if (total === 0) return '0 秒';
  if (total % 86400 === 0) return `${total / 86400} 天`;
  if (total % 3600 === 0) return `${total / 3600} 小时`;
  if (total % 60 === 0) return `${total / 60} 分钟`;
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  return parts.length > 0 ? parts.join(' ') : `${total} 秒`;
}

export function ConversationTypeTag({ type }: { type: ConversationType }) {
  return (
    <Tag color={CONVERSATION_TYPE_COLOR[type] || 'default'}>
      {CONVERSATION_TYPE_LABEL[type] || type}
    </Tag>
  );
}

/** 消息状态标签组合：已焚毁 / 已撤回 / 加密，三者互不排斥 */
export function MessageStatusTags(props: {
  destroyed: boolean;
  recalled: boolean;
  encrypted: boolean;
}) {
  const tags: React.ReactNode[] = [];
  if (props.destroyed) tags.push(<Tag key="destroyed" color="red">已焚毁</Tag>);
  if (props.recalled) tags.push(<Tag key="recalled" color="orange">已撤回</Tag>);
  if (props.encrypted) tags.push(<Tag key="encrypted" color="blue">加密</Tag>);
  // 空组合不渲染彩色 Tag：淡色「正常」既避免整格空白，也不抢视觉焦点
  if (tags.length === 0) {
    return (
      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>正常</span>
    );
  }
  return (
    <Space size={4} wrap>
      {tags}
    </Space>
  );
}

const sectionStyle: React.CSSProperties = {
  margin: '20px 0 8px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text)',
};

const mutedStyle: React.CSSProperties = { fontSize: 13, color: 'var(--text-3)' };

/** 详情正文；单独成组件是为了让 detail 先被收窄再解构，避免可空字段散落各处 */
const DetailBody: React.FC<{ detail: AdminMessageDetail }> = ({ detail }) => {
  const { message: msg, receipts, acked_count: ackedCount, tombstone } = detail;
  const summary = summarizeReceipts(receipts);
  const readPercent =
    summary.total > 0 ? Math.round((summary.read / summary.total) * 100) : 0;

  return (
    <>
      <div style={{ ...sectionStyle, marginTop: 0 }}>基本信息</div>
      <Descriptions column={2} bordered size="small">
        {/* span 逐行配平：每行 span 之和恒为 2，Descriptions 才不会补出半行空格 */}
        <Descriptions.Item label="消息 ID" span={2}>
          <IdText value={msg.id} />
        </Descriptions.Item>
        <Descriptions.Item label="会话 ID">
          <IdText value={msg.conversation_id} />
        </Descriptions.Item>
        <Descriptions.Item label="会话名称">
          {msg.conversation_name || <span style={mutedStyle}>—</span>}
        </Descriptions.Item>
        <Descriptions.Item label="会话类型">
          <ConversationTypeTag type={msg.conversation_type} />
        </Descriptions.Item>
        <Descriptions.Item label="发送人">
          {msg.sender_name || <span style={mutedStyle}>—</span>}
        </Descriptions.Item>
        <Descriptions.Item label="发送人 ID">
          <IdText value={msg.sender_id} />
        </Descriptions.Item>
        <Descriptions.Item label="消息类型">
          {MESSAGE_TYPE_LABEL[msg.type] || msg.type}
        </Descriptions.Item>
        <Descriptions.Item label="状态" span={2}>
          <MessageStatusTags
            destroyed={msg.is_destroyed}
            recalled={msg.is_recalled}
            encrypted={msg.is_encrypted}
          />
        </Descriptions.Item>
        <Descriptions.Item label="内容摘要" span={2}>
          {msg.content_snippet || (
            <span style={mutedStyle}>—（加密或已焚毁）</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="焚毁 TTL">
          {msg.burn_ttl_seconds == null ? (
            <span style={mutedStyle}>非焚毁</span>
          ) : (
            formatBurnTtl(msg.burn_ttl_seconds)
          )}
        </Descriptions.Item>
        <Descriptions.Item label="销毁上限">
          <DateTimeText value={msg.destroy_at} />
        </Descriptions.Item>
        <Descriptions.Item label="实际焚毁时间">
          <DateTimeText value={msg.destroyed_at} />
        </Descriptions.Item>
        <Descriptions.Item label="焚毁原因">
          {destroyReasonLabel(msg.destroy_reason)}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间" span={2}>
          <DateTimeText value={msg.created_at} />
        </Descriptions.Item>
      </Descriptions>

      <div style={sectionStyle}>回执汇总</div>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="应读人数"
            value={summary.total}
            valueStyle={{ color: 'var(--text)' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已读"
            value={summary.read}
            valueStyle={{ color: 'var(--text)' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已点开"
            value={summary.revealed}
            valueStyle={{ color: 'var(--text)' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已焚毁"
            value={summary.burned}
            valueStyle={{ color: 'var(--text)' }}
          />
        </Col>
      </Row>
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-2)',
            marginBottom: 4,
          }}
        >
          已读率 {readPercent}%（{summary.read} / {summary.total}）
        </div>
        <Progress
          percent={readPercent}
          showInfo={false}
          strokeColor="var(--accent)"
          trailColor="var(--surface-hover)"
          size="small"
        />
      </div>

      <div style={sectionStyle}>回执明细</div>
      <Table<MessageReceipt>
        rowKey="user_id"
        size="small"
        pagination={false}
        columns={RECEIPT_COLUMNS}
        dataSource={receipts}
      />

      <div style={sectionStyle}>焚毁状态</div>
      {msg.is_destroyed ? (
        <>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="状态">
              <Tag color="red">已焚毁</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="销毁时间">
              <DateTimeText value={msg.destroyed_at} />
            </Descriptions.Item>
            <Descriptions.Item label="销毁原因">
              {destroyReasonLabel(msg.destroy_reason)}
            </Descriptions.Item>
            <Descriptions.Item label="已确认真删人数">
              {ackedCount}
            </Descriptions.Item>
          </Descriptions>
          <div
            style={{
              margin: '12px 0 8px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-2)',
            }}
          >
            真删墓碑
          </div>
          {tombstone ? (
            <Descriptions column={2} bordered size="small">
              {Object.entries(tombstone).map(([key, value], idx, all) => (
                <Descriptions.Item
                  key={key}
                  label={TOMBSTONE_KEY_LABEL[key] || key}
                  // 奇数个字段时末项占满两格，保持每行 span 之和 = 2
                  span={all.length % 2 === 1 && idx === all.length - 1 ? 2 : 1}
                >
                  {renderTombstoneValue(key, value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <div style={mutedStyle}>尚未真删（等待客户端确认）</div>
          )}
        </>
      ) : (
        <div style={mutedStyle}>未焚毁</div>
      )}
    </>
  );
};

interface Props {
  /** 待查看的消息 ID；为 null 时抽屉关闭 */
  id: string | null;
  /** 外部触发重新拉取的版本号（如手动焚毁成功），自增即可刷新详情 */
  reloadToken: number;
  onClose: () => void;
}

const MessageDetailDrawer: React.FC<Props> = ({ id, reloadToken, onClose }) => {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<AdminMessageDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let alive = true;
    setLoading(true);
    // 切换到另一条消息时先清掉上一条详情，同一消息刷新则保留旧数据避免闪烁
    setDetail((prev) => (prev && prev.message.id === id ? prev : null));
    adminMessageApi
      .detail(id)
      .then((res) => {
        if (alive) setDetail(res);
      })
      .catch((e: unknown) => {
        message.error(e instanceof Error ? e.message : '加载消息详情失败');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer
      title="消息详情"
      width={800}
      open={!!id}
      onClose={onClose}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {detail ? (
          <DetailBody detail={detail} />
        ) : loading ? null : (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </Drawer>
  );
};

export default MessageDetailDrawer;
