import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { auditApi } from '../../api/audit';
import type { AuditLogItem, AuditLogQuery } from '../../types';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const ACTION_OPTIONS = [
  { label: '登录', value: 'login' },
  { label: '修改密码', value: 'change_password' },
  { label: '开通账号', value: 'create_account' },
  { label: '批量导入账号', value: 'batch_import_accounts' },
  { label: '重置密码', value: 'reset_password' },
  { label: '启用账号', value: 'enable_account' },
  { label: '停用账号', value: 'disable_account' },
  { label: '下线设备', value: 'remove_device' },
];

const ACTION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

const TARGET_TYPE_LABEL: Record<string, string> = {
  user: '用户',
  device: '设备',
  account: '账号',
};

interface Filters {
  action?: string;
  target_type?: string;
  keyword?: string;
  start_time?: string;
  end_time?: string;
}

const AuditLog: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [data, setData] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({});

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params: AuditLogQuery = { page, pageSize, ...filters };
      const res = await auditApi.list(params);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const onSearch = () => {
    const v = form.getFieldsValue();
    setPage(1);
    const range = v.range;
    setFilters({
      action: v.action || undefined,
      target_type: v.target_type || undefined,
      keyword: v.keyword || undefined,
      start_time: range?.[0]?.format('YYYY-MM-DD'),
      end_time: range?.[1]?.format('YYYY-MM-DD'),
    });
  };

  const onReset = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  const renderAction = (action: string) => {
    const label = ACTION_LABEL_MAP[action] || action;
    const colorMap: Record<string, string> = {
      login: 'blue',
      change_password: 'orange',
      create_account: 'green',
      batch_import_accounts: 'green',
      reset_password: 'orange',
      enable_account: 'green',
      disable_account: 'red',
      remove_device: 'red',
    };
    return <Tag color={colorMap[action] || 'default'}>{label}</Tag>;
  };

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作人',
      width: 160,
      render: (_, r) => {
        if (!r.user_id) return <Text type="secondary">系统</Text>;
        return (
          <div>
            <div>{r.user_display_name || '-'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.user_phone || ''}
            </Text>
          </div>
        );
      },
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 120,
      render: (v: string) => renderAction(v),
    },
    {
      title: '目标类型',
      dataIndex: 'target_type',
      width: 90,
      render: (v: string | null) =>
        v ? TARGET_TYPE_LABEL[v] || v : '-',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      ellipsis: true,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} mouseEnterDelay={0.3}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip_address',
      width: 140,
      className: 'cell-mono',
      render: (v: string | null) => v || '-',
    },
    {
      title: 'User Agent',
      dataIndex: 'user_agent',
      width: 200,
      ellipsis: true,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} mouseEnterDelay={0.3}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {v}
            </Text>
          </Tooltip>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <Card
      title="审计日志"
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchList}>
          刷新
        </Button>
      }
    >
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 16, rowGap: 12 }}
      >
        <Form.Item name="action">
          <Select
            placeholder="操作类型"
            allowClear
            style={{ width: 150 }}
            options={ACTION_OPTIONS}
          />
        </Form.Item>
        <Form.Item name="target_type">
          <Select
            placeholder="目标类型"
            allowClear
            style={{ width: 120 }}
            options={[
              { label: '用户', value: 'user' },
              { label: '设备', value: 'device' },
            ]}
          />
        </Form.Item>
        <Form.Item name="keyword">
          <Input
            placeholder="搜索详情"
            allowClear
            style={{ width: 200 }}
            onPressEnter={onSearch}
          />
        </Form.Item>
        <Form.Item name="range">
          <RangePicker style={{ width: 260 }} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={onSearch}
            >
              查询
            </Button>
            <Button onClick={onReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<AuditLogItem>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          pageSizeOptions: [10, 20, 50, 100, 200],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Card>
  );
};

export default AuditLog;
