import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { groupApi } from '../../api/group';
import { accountApi } from '../../api/account';
import type {
  GroupCreateBody,
  GroupInfo,
  GroupMember,
  SafeUser,
} from '../../types';

const { TextArea } = Input;

/** 将后端返回的相对路径头像转为完整 URL */
const resolveAsset = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://112.4.135.254:19091/api/v1';
  const origin = base.replace(/\/api\/v\d+\/?$/, '');
  return origin + (url.startsWith('/') ? url : '/' + url);
};

const GroupList: React.FC = () => {
  const { message } = App.useApp();
  const [createForm] = Form.useForm();

  // 列表
  const [data, setData] = useState<GroupInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [includeDissolved, setIncludeDissolved] = useState(false);

  // 成员管理
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberDrawerGroup, setMemberDrawerGroup] = useState<GroupInfo | null>(null);

  // 创建群组
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [allUsers, setAllUsers] = useState<SafeUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 解散
  const [dissolvingId, setDissolvingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupApi.list({
        page,
        pageSize,
        keyword: keyword || undefined,
        include_dissolved: includeDissolved ? 'true' : undefined,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载群组列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, includeDissolved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await accountApi.list({ page: 1, pageSize: 200 });
      setAllUsers(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchMembers = useCallback(async (id: string) => {
    setMembersLoading(true);
    try {
      const res = await groupApi.members(id);
      setMembers(res || []);
    } catch (e: any) {
      message.error(e.message || '加载成员失败');
    } finally {
      setMembersLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openMemberDrawer = (record: GroupInfo) => {
    setMemberDrawerGroup(record);
    fetchMembers(record.id);
  };

  const openCreateGroup = () => {
    setCreateOpen(true);
    if (allUsers.length === 0) loadUsers();
  };

  const onCreateGroup = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const body: GroupCreateBody = {
        name: values.name,
        description: values.description,
        is_channel: false,
        member_ids: values.member_ids || [],
      };
      await groupApi.create(body);
      message.success('群组已创建');
      setCreateOpen(false);
      createForm.resetFields();
      setPage(1);
      fetchList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const onRemoveMember = async (member: GroupMember) => {
    if (!memberDrawerGroup) return;
    try {
      await groupApi.removeMember(memberDrawerGroup.id, member.user_id);
      message.success('已移除成员');
      fetchMembers(memberDrawerGroup.id);
      fetchList();
    } catch (e: any) {
      message.error(e.message || '移除失败');
    }
  };

  const onDissolve = async (record: GroupInfo) => {
    setDissolvingId(record.id);
    try {
      await groupApi.dissolve(record.id);
      message.success('群组已强制解散（消息保留留痕）');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '解散失败');
    } finally {
      setDissolvingId(null);
    }
  };

  const memberColumns: ColumnsType<GroupMember> = [
    {
      title: '成员',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar size={28} src={resolveAsset(r.user_avatar_url) || '/images/mr.png'}>
            {(r.user_display_name || '?').charAt(0)}
          </Avatar>
          <span>{r.user_display_name || 'Unknown'}</span>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (v: GroupMember['role']) => {
        if (v === 'owner') return <Tag color="gold">群主</Tag>;
        if (v === 'admin') return <Tag color="blue">管理员</Tag>;
        return <Tag>成员</Tag>;
      },
    },
    {
      title: '加入时间',
      dataIndex: 'joined_at',
      width: 170,
      render: (v: string) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, r) =>
        r.role === 'owner' ? (
          <span style={{ color: 'var(--text-3)' }}>-</span>
        ) : (
          <Popconfirm
            title="确认移除该成员？"
            onConfirm={() => onRemoveMember(r)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger  >
              移除
            </Button>
          </Popconfirm>
        ),
    },
  ];

  const columns: ColumnsType<GroupInfo> = [
    {
      title: '群名称',
      dataIndex: 'name',
      width: 200,
      render: (v: string | null, r) => (
        <Space>
          <Avatar size={32} src={resolveAsset(r.avatar_url) || '/images/mr.png'}>
            {(v || 'G').charAt(0)}
          </Avatar>
          <div>
            <div style={{ lineHeight: 1.2 }}>{v || '(未命名)'}</div>
            {r.description && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.description}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'is_channel',
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="purple">频道</Tag> : <Tag>群组</Tag>,
    },
    {
      title: '群主',
      dataIndex: 'owner_display_name',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '成员数',
      dataIndex: 'member_count',
      width: 90,
    },
    {
      title: '状态',
      dataIndex: 'dissolved_at',
      width: 100,
      render: (v: string | null) =>
        v ? <Tag color="red">已解散</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '最近消息',
      dataIndex: 'last_message_at',
      width: 170,
      render: (v: string | null) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => openMemberDrawer(record)}
            disabled={!!record.dissolved_at}
          >
            成员
          </Button>
          <Popconfirm
            title="确认强制解散该群组？"
            description="管理员强制解散将保留消息记录供审计，成员不可再发消息。"
            okText="确认解散"
            okButtonProps={{ danger: true, loading: dissolvingId === record.id }}
            cancelText="取消"
            onConfirm={() => onDissolve(record)}
            disabled={!!record.dissolved_at}
          >
            <Button
              type="link"
              size="small"
              danger
              disabled={!!record.dissolved_at}
            >
              解散
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="群组管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateGroup}
          >
            创建群组
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索群名称"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => {
            setKeyword(v);
            setPage(1);
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          包含已解散
        </span>
        <Switch
          size="small"
          checked={includeDissolved}
          onChange={(checked) => {
            setIncludeDissolved(checked);
            setPage(1);
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchList}>
          刷新
        </Button>
      </Space>

      <Table<GroupInfo>
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
          showTotal: (t) => `共 ${t} 个群组`,
          pageSizeOptions: [10, 20, 50, 100, 200],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      {/* 成员管理抽屉 */}
      <Drawer
        title={`成员管理 · ${memberDrawerGroup?.name || ''}`}
        width={640}
        open={!!memberDrawerGroup}
        onClose={() => setMemberDrawerGroup(null)}
      >
        <Table<GroupMember>
          rowKey="id"
          size="small"
          loading={membersLoading}
          columns={memberColumns}
          dataSource={members}
          pagination={false}
        />
      </Drawer>

      {/* 创建群组弹框 */}
      <Modal
        title="创建群组"
        open={createOpen}
        onOk={onCreateGroup}
        confirmLoading={creating}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
        width={520}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="群名称"
            rules={[{ required: true, message: '请输入群名称' }]}
          >
            <Input placeholder="如：产品评审群" maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="description" label="群简介">
            <TextArea rows={3} maxLength={500} showCount placeholder="可选" />
          </Form.Item>
          <Form.Item name="member_ids" label="初始成员">
            <Select
              mode="multiple"
              placeholder="可选，可后续添加"
              loading={loadingUsers}
              showSearch
              optionFilterProp="label"
              options={allUsers
                .filter((u) => u.status === 'active')
                .map((u) => ({
                  label: `${u.display_name}（${u.phone}）`,
                  value: u.id,
                }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GroupList;
