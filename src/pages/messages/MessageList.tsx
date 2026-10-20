import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PaperClipOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { adminMessageApi } from '../../api/admin';
import type { AdminMessage, AdminMessageQuery, MessageType } from '../../types/admin';
import MessageDetailDrawer, {
  ConversationTypeTag,
  MESSAGE_TYPE_LABEL,
  MessageStatusTags,
  formatBurnTtl,
  formatDateTime,
} from './components/MessageDetailDrawer';
import DestroyMessageModal from './components/DestroyMessageModal';

const { RangePicker } = DatePicker;

const TYPE_OPTIONS: { label: string; value: MessageType }[] = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '语音', value: 'voice' },
  { label: '视频', value: 'video' },
  { label: '文件', value: 'file' },
];

/** 筛选条件即查询参数去掉分页项，避免两处各写一份字段清单 */
type Filters = Omit<AdminMessageQuery, 'page' | 'pageSize'>;

interface FilterFormValues {
  conversation_id?: string;
  sender_id?: string;
  type?: MessageType;
  keyword?: string;
  range?: [Dayjs | null, Dayjs | null] | null;
  burn_only?: boolean;
  is_destroyed?: boolean;
}

/** 单元格内单行文本基座：不允许折行，溢出交给 ellipsis */
const oneLine: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 筛选栅格列：大屏一行 4 个，中屏 3 个，窄屏 1 个 */

/**
 * 列宽合计 165+210+165+85+120+380+120+150 = 1395，
 * 与 scroll.x 精确一致，1920 视口下列宽不会被压缩、不重叠。
 */
const SCROLL_X = 1460;

const MessageList: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FilterFormValues>();

  const [data, setData] = useState<AdminMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({});

  // 详情抽屉与手动焚毁弹框的目标
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailToken, setDetailToken] = useState(0);
  const [destroyTargetId, setDestroyTargetId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminMessageApi.list({ page, pageSize, ...filters });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: unknown) {
      // 失败只提示，不清空已有数据，避免断网时表格瞬间变空
      message.error(e instanceof Error ? e.message : '加载消息列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSearch = () => {
    const v = form.getFieldsValue();
    const range = v.range;
    setPage(1);
    setFilters({
      conversation_id: v.conversation_id?.trim() || undefined,
      sender_id: v.sender_id?.trim() || undefined,
      type: v.type || undefined,
      keyword: v.keyword?.trim() || undefined,
      start_time: range?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
      end_time: range?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      burn_only: v.burn_only ? true : undefined,
      is_destroyed: v.is_destroyed ? true : undefined,
    });
  };

  const onReset = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  /** 焚毁成功：弹框由调用方关闭，列表与已打开的详情同步刷新 */
  const onDestroyed = () => {
    setDestroyTargetId(null);
    fetchList();
    setDetailToken((t) => t + 1);
  };

  const columns: ColumnsType<AdminMessage> = [
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 165,
      render: (v: string) => (
        <span
          style={{ ...oneLine, fontSize: 13, color: 'var(--text-2)' }}
        >
          {formatDateTime(v)}
        </span>
      ),
    },
    {
      title: '会话',
      key: 'conversation',
      width: 200,
      // 会话名与类型分列：类型单独成列后，这里只留名称（无名私聊显示淡色 —）
      render: (_, r) =>
        r.conversation_name ? (
          <Tooltip title={r.conversation_name} mouseEnterDelay={0.3}>
            <span
              style={{
                ...oneLine,
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              {r.conversation_name}
            </span>
          </Tooltip>
        ) : (
          <span style={{ ...oneLine, fontSize: 13, color: 'var(--text-3)' }}>
            —
          </span>
        ),
    },
    {
      title: '会话类型',
      key: 'conversation_type',
      width: 110,
      render: (_, r) =>
        r.conversation_type ? (
          <ConversationTypeTag type={r.conversation_type} />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>—</span>
        ),
    },
    {
      title: '发送人',
      key: 'sender',
      width: 165,
      render: (_, r) => {
        const name = r.sender_name ?? r.sender_id;
        return (
          <div>
            <Tooltip title={name} mouseEnterDelay={0.3}>
              <div
                style={{
                  ...oneLine,
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                {name}
              </div>
            </Tooltip>
            <div
              style={{
                ...oneLine,
                fontSize: 11,
                color: 'var(--text-3)',
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {r.sender_phone ?? '—'}
            </div>
          </div>
        );
      },
    },
    {
      title: '消息类型',
      dataIndex: 'type',
      width: 90,
      render: (v: MessageType) => (
        <Tag style={{ marginInlineEnd: 0 }}>{MESSAGE_TYPE_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, r) => (
        <MessageStatusTags
          destroyed={r.is_destroyed}
          recalled={r.is_recalled}
          encrypted={r.is_encrypted}
        />
      ),
    },
    {
      title: '内容摘要',
      key: 'content',
      width: 340,
      render: (_, r) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          {/* 附件与摘要同格：附件是小徽标，占位固定，摘要吃掉剩余宽度 */}
          {r.has_attachment ? (
            <Tag
              color="geekblue"
              style={{
                ...oneLine,
                flex: 'none',
                maxWidth: 160,
                marginInlineEnd: 0,
              }}
            >
              <PaperClipOutlined /> {r.file_name ?? '附件'}
            </Tag>
          ) : null}
          {r.content_snippet ? (
            <Tooltip title={r.content_snippet} mouseEnterDelay={0.3}>
              <span
                style={{
                  ...oneLine,
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                {r.content_snippet}
              </span>
            </Tooltip>
          ) : r.has_attachment ? null : (
            // 无正文且不是附件消息：状态列已标明加密/已焚毁/已撤回，这里不再重复长文案
            <span
              style={{ ...oneLine, fontSize: 13, color: 'var(--text-3)' }}
            >
              —
            </span>
          )}
        </div>
      ),
    },
    {
      title: '焚毁',
      key: 'burn',
      width: 120,
      render: (_, r) => {
        // 销毁上限不再独占一列：作为 TTL 单元格的 Tooltip 承载第三类信息
        const text =
          r.burn_ttl_seconds != null ? (
            <span
              style={{
                ...oneLine,
                fontSize: 13,
                color: 'var(--text)',
              }}
            >
              {formatBurnTtl(r.burn_ttl_seconds)}
            </span>
          ) : r.is_burn ? (
            <Tag color="volcano" style={{ marginInlineEnd: 0 }}>
              焚毁
            </Tag>
          ) : (
            <span
              style={{ ...oneLine, fontSize: 13, color: 'var(--text-3)' }}
            >
              非焚毁
            </span>
          );

        if (!r.destroy_at) return text;
        return (
          <Tooltip
            title={`销毁上限：${formatDateTime(r.destroy_at)}`}
            mouseEnterDelay={0.3}
          >
            <span style={{ cursor: 'help' }}>{text}</span>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => setDetailId(r.id)}>
            详情
          </Button>
          <Button
            size="small"
            type="link"
            danger
            disabled={r.is_destroyed}
            onClick={() => setDestroyTargetId(r.id)}
          >
            手动焚毁
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="消息管理"
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchList}>
          刷新
        </Button>
      }
    >
      <Form form={form} style={{ marginBottom: 12 }}>
        {/* 紧凑工具栏：短字段用固定宽度，避免大屏上被 1/4 栅格拉到 350px+ */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Form.Item name="conversation_id" style={{ marginBottom: 0 }}>
            <Input
              placeholder="会话 ID"
              allowClear
              style={{ width: 220 }}
              onPressEnter={onSearch}
            />
          </Form.Item>
          <Form.Item name="sender_id" style={{ marginBottom: 0 }}>
            <Input
              placeholder="发送人 ID"
              allowClear
              style={{ width: 220 }}
              onPressEnter={onSearch}
            />
          </Form.Item>
          <Form.Item name="type" style={{ marginBottom: 0 }}>
            <Select
              placeholder="消息类型"
              allowClear
              style={{ width: 140 }}
              options={TYPE_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="keyword" style={{ marginBottom: 0 }}>
            <Input
              placeholder="搜索关键词"
              allowClear
              style={{ width: 220 }}
              onPressEnter={onSearch}
            />
          </Form.Item>
          <Form.Item name="range" style={{ marginBottom: 0 }}>
            <RangePicker showTime style={{ width: 330 }} />
          </Form.Item>
          <Form.Item
            name="burn_only"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>仅焚毁消息</Checkbox>
          </Form.Item>
          <Form.Item
            name="is_destroyed"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>仅已焚毁</Checkbox>
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </div>
        </div>
      </Form>

      <Table<AdminMessage>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: SCROLL_X }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条消息`,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <MessageDetailDrawer
        id={detailId}
        reloadToken={detailToken}
        onClose={() => setDetailId(null)}
      />
      <DestroyMessageModal
        open={destroyTargetId !== null}
        messageId={destroyTargetId}
        onCancel={() => setDestroyTargetId(null)}
        onSuccess={onDestroyed}
      />
    </Card>
  );
};

export default MessageList;
