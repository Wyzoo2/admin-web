import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Table,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { destroyRecordApi } from '../../../api/admin';
import type {
  DestroyReasonFilter,
  DestroyRecord,
  DestroyRecordQuery,
  MessageType,
} from '../../../types/admin';
import IdText from '../../../components/IdText';
import {
  CONVERSATION_TYPE_LABEL,
  ConversationTypeTag,
  DESTROY_REASON_OPTIONS,
  DestroyReasonTag,
  DestroyStageTag,
  EllipsisText,
  EmptyValue,
  MESSAGE_TYPE_LABEL,
  OPERATOR_TRACE_TIP,
  csvCell,
  destroyReasonLabel,
  destroyStageLabel,
  formatDateTime,
  formatDuration,
} from './shared';

const { RangePicker } = DatePicker;

/** 导出时单页拉取量；配合 MAX_EXPORT_PAGES 防止后端 total 异常导致死循环 */
const EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGES = 20;

interface DestroyFilters {
  reason?: DestroyReasonFilter | '';
  start_time?: string;
  end_time?: string;
  conversation_id?: string;
}

interface DestroyFilterFormValues {
  reason?: DestroyReasonFilter | '';
  range?: [Dayjs, Dayjs] | null;
  conversation_id?: string;
}

const DestroyRecordTable: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<DestroyFilterFormValues>();

  const [data, setData] = useState<DestroyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<DestroyFilters>({});

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: DestroyRecordQuery = { page, pageSize, ...filters };
      const res = await destroyRecordApi.list(params);
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
      reason: values.reason || undefined,
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

  /** 按当前筛选条件循环分页拉全量，导出 CSV（UTF-8 BOM，Excel 打开不乱码） */
  const onExport = async () => {
    setExporting(true);
    try {
      const all: DestroyRecord[] = [];
      let currentPage = 1;
      let totalRecords = 0;
      do {
        const params: DestroyRecordQuery = {
          page: currentPage,
          pageSize: EXPORT_PAGE_SIZE,
          ...filters,
        };
        const res = await destroyRecordApi.list(params);
        const list = res.data || [];
        all.push(...list);
        totalRecords = res.total || 0;
        currentPage += 1;
        if (list.length < EXPORT_PAGE_SIZE) break;
      } while (all.length < totalRecords && currentPage <= MAX_EXPORT_PAGES);

      // 表头与表格列一一对应：操作人已删列，阶段保留
      const headers = [
        '阶段',
        '销毁时间',
        '消息 ID',
        '会话',
        '会话类型',
        '发送人',
        '消息类型',
        '发出时间',
        '存活时长',
        '原因',
      ];
      const rows = all.map((r) => [
        csvCell(destroyStageLabel(r.stage)),
        formatDateTime(r.destroyed_at),
        csvCell(r.message_id),
        csvCell(r.conversation_name ?? '—'),
        csvCell(
          r.conversation_type
            ? CONVERSATION_TYPE_LABEL[r.conversation_type] || r.conversation_type
            : '—',
        ),
        csvCell(r.sender_name ?? '—'),
        csvCell(MESSAGE_TYPE_LABEL[r.type] || r.type),
        formatDateTime(r.created_at),
        csvCell(formatDuration(r.alive_seconds)),
        csvCell(destroyReasonLabel(r.destroy_reason)),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\r\n',
      );
      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `销毁流水_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`已导出 ${all.length} 条记录`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '请求失败');
    } finally {
      setExporting(false);
    }
  };

  /** 列宽之和必须等于 scroll.x（见 TABLE_WIDTH），否则会出现列重叠或缺列 */
  const columns: ColumnsType<DestroyRecord> = [
    {
      title: '阶段',
      dataIndex: 'stage',
      width: 100,
      render: (value: string | null) => <DestroyStageTag stage={value} />,
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
      title: '消息 ID',
      dataIndex: 'message_id',
      width: 160,
      // 36 位 UUID 整段渲染会折成 2~3 行，把整行行高撞高：改单行省略 + 点击复制
      render: (value: string) => <IdText value={value} />,
    },
    {
      title: '会话',
      dataIndex: 'conversation_name',
      width: 200,
      // 会话名与类型分列：这里只留名称，无名私聊显示淡色 —
      render: (value: string | null) => <EllipsisText value={value} />,
    },
    {
      title: '会话类型',
      width: 110,
      render: (_, r) =>
        r.conversation_type ? (
          <ConversationTypeTag type={r.conversation_type} />
        ) : (
          <EmptyValue />
        ),
    },
    {
      title: '发送人',
      dataIndex: 'sender_name',
      width: 130,
      render: (value: string | null) => <EllipsisText value={value} />,
    },
    {
      title: '消息类型',
      dataIndex: 'type',
      width: 90,
      render: (value: MessageType | string) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {MESSAGE_TYPE_LABEL[value] || value}
        </span>
      ),
    },
    {
      title: '发出时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => (
        <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(value)}</span>
      ),
    },
    {
      title: '存活时长',
      dataIndex: 'alive_seconds',
      width: 140,
      align: 'right',
      render: (value: number) => (
        <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          {formatDuration(value)}
        </span>
      ),
    },
    {
      title: '原因',
      dataIndex: 'destroy_reason',
      width: 120,
      render: (value: string) => (
        <Tooltip title={OPERATOR_TRACE_TIP} mouseEnterDelay={0.3}>
          <span style={{ display: 'inline-block', maxWidth: '100%' }}>
            <DestroyReasonTag reason={value} />
          </span>
        </Tooltip>
      ),
    },
  ];

  /** 100+170+160+200+110+130+90+170+140+120 */
  const TABLE_WIDTH = 1390;

  return (
    <>
      <Form form={form} style={{ marginBottom: 12 }}>
        {/* 紧凑工具栏：短字段固定宽度 + 自动换行，避免被栅格拉宽 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Form.Item name="reason" style={{ marginBottom: 0 }}>
            <Select
              placeholder="焚毁原因"
              allowClear
              style={{ width: 160 }}
              options={DESTROY_REASON_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="range" style={{ marginBottom: 0 }}>
            <RangePicker style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="conversation_id" style={{ marginBottom: 0 }}>
            <Input
              placeholder="会话 ID"
              allowClear
              style={{ width: 220 }}
              onPressEnter={onSearch}
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
            <Button icon={<DownloadOutlined />} onClick={onExport} loading={exporting}>
              导出 CSV
            </Button>
          </div>
        </div>
      </Form>

      <Table<DestroyRecord>
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

export default DestroyRecordTable;
