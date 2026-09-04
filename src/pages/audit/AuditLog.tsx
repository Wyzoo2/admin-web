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
import { ReloadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
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
  { label: '注销账号', value: 'delete_account' },
  { label: '下线设备', value: 'remove_device' },
  { label: '解散群组', value: 'dissolve_group' },
  { label: '转让群主', value: 'transfer_ownership' },
  { label: '回复反馈', value: 'reply_feedback' },
  { label: '提交反馈', value: 'submit_feedback' },
  { label: '群主解散', value: 'dissolve_group_by_owner' },
  { label: '发布公告', value: 'publish_announcement' },
  { label: '删除公告', value: 'delete_announcement' },
  { label: '账号删除自动解散群', value: 'dissolve_group_on_account_delete' },
  { label: '更新App版本', value: 'update_app_version' },
  { label: '发布App版本', value: 'publish_app_version' },
  { label: '删除App版本', value: 'delete_app_version' },
];

const ACTION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

const TARGET_TYPE_LABEL: Record<string, string> = {
  user: '用户',
  device: '设备',
  account: '账号',
  group: '群组',
  conversation: '会话',
  feedback: '反馈',
  announcement: '公告',
  app_version: 'App版本',
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
  const [exporting, setExporting] = useState(false);
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

  /** 按当前筛选条件分页拉取全部数据，导出 CSV（UTF-8 BOM） */
  const onExport = async () => {
    setExporting(true);
    try {
      const all: AuditLogItem[] = [];
      let page = 1;
      const pageSize = 200;
      let totalFetched = 0;
      let totalRecords = 0;
      do {
        const params: AuditLogQuery = {
          page,
          pageSize,
          ...filters,
        };
        const res = await auditApi.list(params);
        const list = res.data || [];
        all.push(...list);
        totalRecords = res.total || 0;
        totalFetched += list.length;
        page++;
        if (list.length < pageSize) break;
      } while (totalFetched < totalRecords);

      // CSV 列与转义
      const headers = [
        '时间',
        '操作人',
        '手机号',
        '动作',
        '动作(原始)',
        '目标类型',
        '详情',
        'IP 地址',
        'User Agent',
      ];
      const esc = (v: unknown) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = all.map((r) => [
        r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss') : '',
        esc(r.user_display_name),
        esc(r.user_phone),
        esc(ACTION_LABEL_MAP[r.action] || r.action),
        esc(r.action),
        esc(r.target_type ? TARGET_TYPE_LABEL[r.target_type] || r.target_type : ''),
        esc(r.detail),
        esc(r.ip_address),
        esc(r.user_agent),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\r\n',
      );
      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = dayjs().format('YYYYMMDD_HHmmss');
      a.href = url;
      a.download = `审计日志_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`已导出 ${all.length} 条记录`);
    } catch (e: any) {
      message.error(e.message || '导出失败');
    } finally {
      setExporting(false);
    }
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
      delete_account: 'red',
      remove_device: 'red',
      dissolve_group: 'volcano',
      transfer_ownership: 'geekblue',
      reply_feedback: 'cyan',
      submit_feedback: 'gold',
      dissolve_group_by_owner: 'volcano',
      publish_announcement: 'purple',
      delete_announcement: 'magenta',
      dissolve_group_on_account_delete: 'volcano',
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
      width: 150,
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
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={onExport}
            loading={exporting}
          >
            导出 Excel
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
        </Space>
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
              { label: '群组', value: 'group' },
              { label: '会话', value: 'conversation' },
              { label: '反馈', value: 'feedback' },
              { label: '公告', value: 'announcement' },
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
