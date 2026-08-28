import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { accountApi } from '../../api/account';
import type { SafeUser, UserStatus } from '../../types';
import CreateAccountModal from './components/CreateAccountModal';
import BatchCreateModal from './components/BatchCreateModal';
import ImportExcelModal from './components/ImportExcelModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import AccountDetailDrawer from './components/AccountDetailDrawer';

interface Filters {
  keyword?: string;
  department?: string;
  status?: UserStatus;
}

const AccountList: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [data, setData] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<Filters>({});
  const [departments, setDepartments] = useState<string[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<SafeUser | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountApi.list({ page, pageSize, ...filters });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载账号列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDepartments = useCallback(() => {
    accountApi
      .departments()
      .then((list) => setDepartments(list || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const onSearch = () => {
    const v = form.getFieldsValue();
    setPage(1);
    setFilters({
      keyword: v.keyword || undefined,
      department: v.department || undefined,
      status: v.status || undefined,
    });
  };

  const onResetFilter = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  const onToggleStatus = async (record: SafeUser) => {
    const next: UserStatus = record.status === 'active' ? 'disabled' : 'active';
    try {
      await accountApi.toggleStatus(record.id, next);
      message.success(next === 'disabled' ? '已停用，该账号全端强制下线' : '已启用');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const onDelete = async (record: SafeUser) => {
    try {
      await accountApi.remove(record.id);
      message.success('账号已注销，全端已强制下线');
      fetchList();
      fetchDepartments();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const onMutated = () => {
    fetchList();
    fetchDepartments();
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const pageSize = 200;
      let pageNum = 1;
      let all: SafeUser[] = [];
      // 拉取全部数据（按当前筛选条件）
      while (true) {
        const res = await accountApi.list({
          page: pageNum,
          pageSize,
          ...filters,
        });
        const items = res.data || [];
        all = all.concat(items);
        if (all.length >= (res.total || 0) || items.length === 0) break;
        pageNum++;
      }
      if (all.length === 0) {
        message.warning('没有可导出的数据');
        return;
      }
      // 生成 CSV（UTF-8 BOM，Excel 直接打开不乱码）
      const headers = [
        '手机号', '姓名', '部门', '角色', '状态', '待改密', '创建时间',
      ];
      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = all.map((u) => [
        u.phone,
        u.display_name,
        u.department || '',
        u.role === 'admin' ? '管理员' : '成员',
        u.status === 'active' ? '正常' : '已停用',
        u.force_change_pwd ? '是' : '否',
        u.created_at ? dayjs(u.created_at).format('YYYY-MM-DD HH:mm:ss') : '',
      ].map(escape).join(','));
      const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `账号列表_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${all.length} 条账号数据`);
    } catch (e: any) {
      message.error(e.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<SafeUser> = [
    { title: '手机号', dataIndex: 'phone', width: 140, className: 'cell-mono' },
    { title: '姓名', dataIndex: 'display_name', width: 120 },
    {
      title: '部门',
      dataIndex: 'department',
      width: 140,
      render: (v: string | null) => v || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 90,
      render: (v: string) =>
        v === 'admin' ? <Tag className="tag-solid">管理员</Tag> : <Tag>成员</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) =>
        v === 'active' ? (
          <Tag>正常</Tag>
        ) : (
          <Tag className="tag-solid">已停用</Tag>
        ),
    },
    {
      title: '待改密',
      dataIndex: 'force_change_pwd',
      width: 90,
      render: (v: boolean) => (v ? <Tag className="tag-solid">是</Tag> : '否'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 320,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setDetailId(record.id)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => setResetTarget(record)}>
            重置密码
          </Button>
          <Popconfirm
            title={record.status === 'active' ? '确认停用该账号？' : '确认启用该账号？'}
            description={
              record.status === 'active'
                ? '停用后该账号所有设备将立即强制下线'
                : undefined
            }
            onConfirm={() => onToggleStatus(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small">
              {record.status === 'active' ? '停用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认注销该账号？"
            description="注销后该账号全部 token 立即吊销并强制下线，历史消息保留且不可恢复。"
            okText="确认注销"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => onDelete(record)}
          >
            <Button type="link" size="small" danger  >
              注销
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="账号管理"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
          <Button icon={<TeamOutlined />} onClick={() => setBatchOpen(true)}>
            批量开通
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
            Excel 导入
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={onExport}
          >
            导出 Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            开通账号
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="inline" style={{ marginBottom: 16, rowGap: 12 }}>
        <Form.Item name="keyword">
          <Input.Search
            placeholder="手机号 / 姓名"
            allowClear
            style={{ width: 220 }}
            onSearch={onSearch}
          />
        </Form.Item>
        <Form.Item name="department">
          <Select
            placeholder="部门"
            allowClear
            showSearch
            style={{ width: 180 }}
            options={departments.map((d) => ({ label: d, value: d }))}
          />
        </Form.Item>
        <Form.Item name="status">
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            options={[
              { label: '正常', value: 'active' },
              { label: '已停用', value: 'disabled' },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" onClick={onSearch}>
              查询
            </Button>
            <Button onClick={onResetFilter}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table<SafeUser>
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
          showTotal: (t) => `共 ${t} 个账号`,
          pageSizeOptions: [10, 20, 50, 100, 200],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <CreateAccountModal
        open={createOpen}
        departments={departments}
        onClose={() => setCreateOpen(false)}
        onSuccess={onMutated}
      />
      <BatchCreateModal
        open={batchOpen}
        departments={departments}
        onClose={() => setBatchOpen(false)}
        onSuccess={onMutated}
      />
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={onMutated}
      />
      <ResetPasswordModal
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <AccountDetailDrawer id={detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
};

export default AccountList;
