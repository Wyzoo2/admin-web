import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Progress,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { destroyRecordApi } from '../../../api/admin';
import type {
  ConversationType,
  PendingPurgeQuery,
  PendingPurgeRecord,
} from '../../../types/admin';
import IdText from '../../../components/IdText';
import {
  ConversationTypeTag,
  DestroyReasonTag,
  DestroyStageTag,
  EllipsisText,
  EmptyValue,
  formatDateTime,
} from './shared';

const { RangePicker } = DatePicker;

interface PendingFilters {
  start_time?: string;
  end_time?: string;
  conversation_id?: string;
}

interface PendingFilterFormValues {
  range?: [Dayjs, Dayjs] | null;
  conversation_id?: string;
}

const PendingPurgeTable: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<PendingFilterFormValues>();

  const [data, setData] = useState<PendingPurgeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<PendingFilters>({});

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: PendingPurgeQuery = { page, pageSize, ...filters };
      const res = await destroyRecordApi.pendingPurge(params);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      // 接口未实现（如 404）时保留已有数据，只提示后端文案
      message.error(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, message]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const onSearch = () => {
    const values = form.getFieldsValue();
    const range = values.range;
    setPage(1);
    setFilters({
      start_time: range?.[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      end_time: range?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      conversation_id: values.conversation_id?.trim() || undefined,
    });
  };

  const onReset = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  /** 列宽之和必须等于 scroll.x（见 TABLE_WIDTH） */
  const columns: ColumnsType<PendingPurgeRecord> = [
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      render: (value: string | null) => <DestroyStageTag stage={value} />,
    },
    {
      title: '消息 ID',
      dataIndex: 'message_id',
      width: 160,
      // 单行省略 + 点击复制，避免 36 位 UUID 折行撑高整行
      render: (value: string) => <IdText value={value} />,
    },
    {
      title: '会话',
      dataIndex: 'conversation_name',
      width: 200,
      render: (value: string | null) => <EllipsisText value={value} />,
    },
    {
      title: '会话类型',
      dataIndex: 'conversation_type',
      width: 110,
      render: (value: ConversationType | null) =>
        value ? <ConversationTypeTag type={value} /> : <EmptyValue />,
    },
    {
      title: '销毁时间',
      dataIndex: 'destroyed_at',
      width: 170,
      render: (value: string) => (
        <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(value)}</span>
      ),
    },
    {
      title: '原因',
      dataIndex: 'destroy_reason',
      width: 120,
      render: (value: string) => <DestroyReasonTag reason={value} />,
    },
    {
      title: '确认进度',
      key: 'ack_progress',
      width: 170,
      render: (_, r) => {
        const need = r.members_need ?? 0;
        const acked = r.acked_count ?? 0;
        const percent =
          need > 0 ? Math.min(100, Math.round((acked / need) * 100)) : 0;
        return (
          <div style={{ lineHeight: 1.4 }}>
            <div
              className="cell-mono"
              style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}
            >
              {acked} / {need}
              <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                {percent}%
              </span>
            </div>
            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              style={{ margin: 0, lineHeight: 1 }}
            />
          </div>
        );
      },
    },
    {
      title: '应真删时间',
      dataIndex: 'will_purge_at',
      width: 170,
      // 主行绝对时间，次行 11px 距今天数；第三类信息一律不放第二行以外
      render: (value: string | null) => {
        if (!value) return <EmptyValue />;
        const target = dayjs(value);
        const days = target.diff(dayjs(), 'day');
        let tipText: string;
        let tipColor = 'var(--text-3)';
        if (target.isBefore(dayjs())) {
          tipColor = 'var(--danger)';
          tipText = days < 0 ? `已过期 ${Math.abs(days)} 天` : '已过期';
        } else if (days === 0) {
          tipText = '今天到期';
        } else {
          tipText = `还剩 ${days} 天`;
        }
        return (
          <div style={{ lineHeight: 1.4 }}>
            <div style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {formatDateTime(value)}
            </div>
            <div style={{ fontSize: 11, color: tipColor, whiteSpace: 'nowrap' }}>
              {tipText}
            </div>
          </div>
        );
      },
    },
  ];

  /** 100+160+110+200+170+120+170+170 */
  const TABLE_WIDTH = 1200;

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="待真删队列"
        description="这里列出已被标记焚毁但尚未被客户端确认真删的消息；will_purge_at = destroyed_at + ack_fallback_days，到期由后端兜底强制物理删除。这是排查「消息已焚毁但库/盘上仍有残留」的关键视图。"
      />

      <Form form={form} style={{ marginBottom: 12 }}>
        {/* 紧凑工具栏：短字段固定宽度 + 自动换行 */}
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
          <Form.Item name="range" style={{ marginBottom: 0 }}>
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </div>
        </div>
      </Form>

      <Table<PendingPurgeRecord>
        rowKey="message_id"
        size="middle"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: TABLE_WIDTH }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </>
  );
};

export default PendingPurgeTable;
