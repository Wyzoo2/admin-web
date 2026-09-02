import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { versionApi } from '../../api/version';
import type { AppVersion, AppPlatform } from '../../types';

const { TextArea } = Input;

/** 格式化文件大小 */
const fmtSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const VersionManagement: React.FC = () => {
  const { message } = App.useApp();
  const [publishForm] = Form.useForm();
  const [notesForm] = Form.useForm();

  const [data, setData] = useState<AppVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 发布新版本弹框
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 编辑更新说明弹框
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AppVersion | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await versionApi.list({ page, pageSize });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      message.error(e.message || '加载版本列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ========== 发布新版本 ==========
  const openPublish = () => {
    publishForm.resetFields();
    setSelectedFile(null);
    publishForm.setFieldsValue({ platform: 'android', force: false });
    setPublishOpen(true);
  };

  const onPublish = async () => {
    try {
      const values = await publishForm.validateFields();
      if (!selectedFile) {
        message.warning('请先选择 APK 安装包');
        return;
      }
      setPublishing(true);
      await versionApi.publish({
        file: selectedFile,
        platform: values.platform,
        version_name: values.version_name,
        version_code: values.version_code,
        force: values.force || false,
        notes: values.notes || undefined,
      });
      message.success('版本发布成功');
      setPublishOpen(false);
      setSelectedFile(null);
      publishForm.resetFields();
      setPage(1);
      fetchList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  // ========== 撤回 / 恢复发布 ==========
  const togglePublished = async (record: AppVersion) => {
    const newPublished = !record.published;
    try {
      await versionApi.patch(record.id, { published: newPublished });
      message.success(newPublished ? '已恢复发布' : '已撤回版本');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  // ========== 切换强制更新 ==========
  const toggleForce = async (record: AppVersion) => {
    try {
      await versionApi.patch(record.id, { force: !record.force });
      message.success(record.force ? '已取消强制更新' : '已设为强制更新');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  // ========== 编辑更新说明 ==========
  const openNotes = (record: AppVersion) => {
    setEditingRecord(record);
    notesForm.setFieldsValue({ notes: record.notes || '' });
    setNotesOpen(true);
  };

  const onSaveNotes = async () => {
    if (!editingRecord) return;
    try {
      const values = await notesForm.validateFields();
      setNotesSaving(true);
      await versionApi.patch(editingRecord.id, { notes: values.notes });
      message.success('更新说明已保存');
      setNotesOpen(false);
      setEditingRecord(null);
      fetchList();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.message || '保存失败');
    } finally {
      setNotesSaving(false);
    }
  };

  // ========== 删除 ==========
  const onDelete = async (record: AppVersion) => {
    try {
      await versionApi.remove(record.id);
      message.success('版本记录已删除');
      fetchList();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  // ========== 表格列 ==========
  const columns: ColumnsType<AppVersion> = [
    {
      title: '版本',
      width: 160,
      render: (_, r) => (
        <div>
          <span style={{ fontWeight: 600 }}>{r.version_name}</span>
          <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: 12 }}>
            #{r.version_code}
          </span>
        </div>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      width: 90,
      render: (v: AppPlatform) => (
        <Tag color={v === 'ios' ? 'blue' : 'green'}>
          {v === 'ios' ? 'iOS' : 'Android'}
        </Tag>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      width: 100,
      render: (v: number) => fmtSize(v),
    },
    {
      title: '状态',
      width: 100,
      render: (_, r) =>
        r.published ? (
          <Tag color="green">已发布</Tag>
        ) : (
          <Tag color="default">已撤回</Tag>
        ),
    },
    {
      title: '强制更新',
      dataIndex: 'force',
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="red">强制</Tag> : <Tag>非强制</Tag>,
    },
    {
      title: '更新说明',
      dataIndex: 'notes',
      ellipsis: true,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} placement="topLeft" mouseEnterDelay={0.3}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <span style={{ color: 'var(--text-3)' }}>—</span>
        ),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 360,
      fixed: 'right',
      render: (_, r) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => togglePublished(r)}
          >
            {r.published ? '撤回' : '恢复发布'}
          </Button>
          <Button type="link" size="small" onClick={() => toggleForce(r)}>
            {r.force ? '取消强更' : '设为强更'}
          </Button>
          <Button type="link" size="small" onClick={() => openNotes(r)}>
            编辑说明
          </Button>
          <Popconfirm
            title="确定删除该版本记录？"
            description="磁盘 APK 文件保留，仅删除记录"
            onConfirm={() => onDelete(r)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="版本管理"
        styles={{ body: { padding: 0 } }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchList}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openPublish}
            >
              发布新版本
            </Button>
          </Space>
        }
      >
        <Table<AppVersion>
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
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* ===== 发布新版本弹框 ===== */}
      <Modal
        title="发布新版本"
        open={publishOpen}
        onCancel={() => setPublishOpen(false)}
        onOk={onPublish}
        confirmLoading={publishing}
        destroyOnHidden
        width={520}
      >
        <Form form={publishForm} layout="vertical" style={{ marginTop: 16 }}>
          {/* 文件上传区域 */}
          <Form.Item label="APK 安装包" required>
            <Upload.Dragger
              accept=".apk"
              maxCount={1}
              beforeUpload={(file) => {
                const isApk = file.name.toLowerCase().endsWith('.apk');
                if (!isApk) {
                  message.error('仅支持 .apk 文件');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 50 * 1024 * 1024) {
                  message.error('文件大小不能超过 50MB');
                  return Upload.LIST_IGNORE;
                }
                setSelectedFile(file);
                return false; // 阻止自动上传
              }}
              onRemove={() => setSelectedFile(null)}
              showUploadList={{ showPreviewIcon: false }}
            >
              <p style={{ marginBottom: 8 }}>
                <CloudUploadOutlined style={{ fontSize: 28, color: 'var(--accent)' }} />
              </p>
              <p style={{ fontSize: 13, color: 'var(--text)' }}>
                点击或拖拽 APK 文件到此区域
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                仅支持 .apk，最大 50MB
              </p>
            </Upload.Dragger>
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item
              label="版本名"
              name="version_name"
              rules={[
                { required: true, message: '请输入版本名' },
                { max: 20, message: '最多 20 字符' },
              ]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如 5.8" />
            </Form.Item>
            <Form.Item
              label="versionCode"
              name="version_code"
              rules={[
                { required: true, message: '请输入 versionCode' },
                { type: 'number', min: 1, message: '必须 ≥ 1' },
              ]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="如 58"
                precision={0}
              />
            </Form.Item>
          </div>

          <Form.Item label="平台" name="platform">
            <Select
              options={[
                { value: 'android', label: 'Android' },
                { value: 'ios', label: 'iOS' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="强制更新"
            name="force"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item
            label="更新说明"
            name="notes"
            rules={[{ max: 2000, message: '最多 2000 字符' }]}
          >
            <TextArea
              rows={4}
              placeholder="发版日志，如：&#10;1. 新增 xxx 功能&#10;2. 修复若干问题"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 编辑更新说明弹框 ===== */}
      <Modal
        title={`编辑更新说明 — ${editingRecord?.version_name || ''}`}
        open={notesOpen}
        onCancel={() => setNotesOpen(false)}
        onOk={onSaveNotes}
        confirmLoading={notesSaving}
        destroyOnHidden
      >
        <Form form={notesForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="notes"
            rules={[{ max: 2000, message: '最多 2000 字符' }]}
          >
            <TextArea rows={6} placeholder="更新说明（发版日志）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default VersionManagement;
