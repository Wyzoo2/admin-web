import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { feedbackApi } from '../../api/feedback';
import type { FeedbackItem, FeedbackStatus } from '../../types';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

const FeedbackList: React.FC = () => {
  const { message } = App.useApp();
  const [replyForm] = Form.useForm();

  const [data, setData] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>();

  const [replyOpen, setReplyOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [current, setCurrent] = useState<FeedbackItem | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feedbackApi.list({
        page,
        pageSize,
        status: statusFilter,
      });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载反馈列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openReply = (record: FeedbackItem) => {
    setCurrent(record);
    replyForm.setFieldsValue({
      admin_reply: record.admin_reply || '',
    });
    setReplyOpen(true);
  };

  const onReply = async () => {
    if (!current) return;
    try {
      const values = await replyForm.validateFields();
      setReplying(true);
      await feedbackApi.reply(current.id, values.reply);
      message.success('回复成功，反馈已标记为已处理');
      setReplyOpen(false);
      replyForm.resetFields();
      setCurrent(null);
      fetchList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.message || '回复失败');
    } finally {
      setReplying(false);
    }
  };

  const columns: ColumnsType<FeedbackItem> = [
    {
      title: '提交人',
      key: 'submitter',
      width: 160,
      render: (_, r) => (
        <div>
          <div>{r.user_display_name || '未知'}</div>
          {r.user_department && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.user_department}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v} mouseEnterDelay={0.3}>
          <span>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      width: 140,
      render: (v: string | null) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: FeedbackStatus) =>
        v === 'pending' ? (
          <Tag color="orange">待处理</Tag>
        ) : (
          <Tag color="green">已处理</Tag>
        ),
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '回复时间',
      dataIndex: 'replied_at',
      width: 170,
      render: (v: string | null) =>
        v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<SendOutlined />}
          onClick={() => openReply(record)}
        >
          {record.status === 'pending' ? '回复' : '编辑回复'}
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="意见反馈"
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchList}>
          刷新
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Button
          type={statusFilter === undefined ? 'primary' : 'default'}
          onClick={() => {
            setStatusFilter(undefined);
            setPage(1);
          }}
        >
          全部
        </Button>
        <Button
          type={statusFilter === 'pending' ? 'primary' : 'default'}
          onClick={() => {
            setStatusFilter('pending');
            setPage(1);
          }}
        >
          待处理
        </Button>
        <Button
          type={statusFilter === 'processed' ? 'primary' : 'default'}
          onClick={() => {
            setStatusFilter('processed');
            setPage(1);
          }}
        >
          已处理
        </Button>
      </Space>

      <Table<FeedbackItem>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条反馈`,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title={current?.status === 'pending' ? '回复反馈' : '编辑回复'}
        open={replyOpen}
        onOk={onReply}
        confirmLoading={replying}
        onCancel={() => {
          setReplyOpen(false);
          replyForm.resetFields();
          setCurrent(null);
        }}
        okText="提交回复"
        cancelText="取消"
        destroyOnHidden
        width={560}
      >
        {current && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {current.user_display_name || '未知'} ·{' '}
              {dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
            <Paragraph
              style={{
                marginTop: 8,
                padding: 12,
                background: 'var(--surface-alt)',
                borderRadius: 8,
                marginBottom: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {current.content}
            </Paragraph>
            {current.contact && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                联系方式：{current.contact}
              </Text>
            )}
          </div>
        )}
        <Form form={replyForm} layout="vertical">
          <Form.Item
            name="admin_reply"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <TextArea
              rows={5}
              maxLength={2000}
              showCount
              placeholder="请输入回复内容，提交后用户可在「我的反馈」中查看"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default FeedbackList;
