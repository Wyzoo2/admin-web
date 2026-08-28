import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { announcementApi } from '../../api/announcement';
import { accountApi } from '../../api/account';
import type {
  Announcement,
  AnnouncementCreateBody,
  AnnouncementPriority,
  AnnouncementTarget,
} from '../../types';

const { TextArea } = Input;

const AnnouncementList: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [data, setData] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementApi.list({ page, pageSize });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载公告列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    accountApi
      .departments()
      .then((list) => setDepartments(list || []))
      .catch(() => undefined);
  }, []);

  const onPublish = async () => {
    try {
      const values = await form.validateFields();
      setPublishing(true);
      const body: AnnouncementCreateBody = {
        title: values.title,
        content: values.content,
        priority: values.priority || 'normal',
        target_type: values.target_type || 'all',
        target_departments:
          values.target_type === 'department'
            ? values.target_departments || []
            : undefined,
      };
      await announcementApi.create(body);
      message.success('公告已发布');
      setPublishOpen(false);
      form.resetFields();
      setPage(1);
      fetchList();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验失败
      message.error(e.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const onDelete = async (record: Announcement) => {
    try {
      await announcementApi.remove(record.id);
      message.success('公告已删除');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns: ColumnsType<Announcement> = [
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v} mouseEnterDelay={0.3} placement="topLeft">
          <span>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      render: (v: AnnouncementPriority) =>
        v === 'urgent' ? <Tag color="red">紧急</Tag> : <Tag>普通</Tag>,
    },
    {
      title: '目标',
      dataIndex: 'target_type',
      width: 140,
      render: (v: AnnouncementTarget, record) => {
        if (v === 'all') return <Tag>全员</Tag>;
        const depts = record.target_departments;
        return (
          <Tooltip title={depts?.join('、')}>
            <Tag>部门: {depts?.length || 0} 个</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '已读人数',
      dataIndex: 'read_count',
      width: 100,
      render: (v: number) => v ?? '-',
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Popconfirm
          title="确认删除该公告？"
          description="删除后不可恢复。"
          okText="确认删除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => onDelete(record)}
        >
          <Button type="link" size="small" danger  >
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="系统公告"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchList}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setPublishOpen(true)}
          >
            发布公告
          </Button>
        </Space>
      }
    >
      <Table<Announcement>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条公告`,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title="发布公告"
        open={publishOpen}
        onOk={onPublish}
        confirmLoading={publishing}
        onCancel={() => {
          setPublishOpen(false);
          form.resetFields();
        }}
        okText="发布"
        cancelText="取消"
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="公告标题" maxLength={100} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入公告内容' }]}
          >
            <TextArea
              placeholder="公告正文"
              rows={6}
              maxLength={5000}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            initialValue="normal"
          >
            <Select
              options={[
                { label: '普通', value: 'normal' },
                { label: '紧急（WebSocket 实时推送）', value: 'urgent' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="target_type"
            label="发布范围"
            initialValue="all"
          >
            <Select
              options={[
                { label: '全员', value: 'all' },
                { label: '指定部门', value: 'department' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.target_type !== cur.target_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('target_type') === 'department' ? (
                <Form.Item
                  name="target_departments"
                  label="目标部门"
                  rules={[
                    { required: true, message: '请选择至少一个部门' },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择部门"
                    options={departments.map((d) => ({ label: d, value: d }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AnnouncementList;
