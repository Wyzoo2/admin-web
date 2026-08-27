import { useState } from 'react';
import { App, AutoComplete, Button, Form, Input, Modal, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { accountApi } from '../../../api/account';
import type { BatchAccountItem, BatchResult } from '../../../types';
import BatchResultView from './BatchResultView';

interface Props {
  open: boolean;
  departments: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  accounts: BatchAccountItem[];
}

const MAX_ROWS = 500;

const BatchCreateModal: React.FC<Props> = ({
  open,
  departments,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const handleClose = () => {
    setResult(null);
    form.resetFields();
    onClose();
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const accounts = (values.accounts || []).map((a) => ({
      phone: a.phone,
      display_name: a.display_name,
      department: a.department || undefined,
    }));
    if (accounts.length === 0) {
      message.warning('请至少填写一条账号');
      return;
    }
    setLoading(true);
    try {
      const res = await accountApi.batchCreate(accounts);
      setResult(res);
      onSuccess();
    } catch (e: any) {
      message.error(e.message || '批量开通失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="批量开通账号"
      open={open}
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={loading}
      okText="提交开通"
      cancelText="关闭"
      width={860}
      destroyOnHidden
      okButtonProps={{ style: result ? { display: 'none' } : undefined }}
    >
      {result ? (
        <BatchResultView result={result} />
      ) : (
        <Form<FormValues>
          form={form}
          style={{ marginTop: 16 }}
          initialValues={{ accounts: [{}] }}
        >
          <Form.List name="accounts">
            {(fields, { add, remove }) => (
              <>
                <div
                  style={{
                    maxHeight: 420,
                    overflowY: 'auto',
                    paddingRight: 8,
                  }}
                >
                  {fields.map((field, idx) => (
                    <Space
                      key={field.key}
                      align="baseline"
                      style={{ display: 'flex', marginBottom: 4 }}
                    >
                      <span style={{ width: 28, color: 'var(--text-3)' }}>{idx + 1}.</span>
                      <Form.Item
                        name={[field.name, 'phone']}
                        rules={[
                          { required: true, message: '手机号必填' },
                          { pattern: /^1\d{10}$/, message: '格式不正确' },
                        ]}
                      >
                        <Input placeholder="手机号" style={{ width: 170 }} maxLength={11} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'display_name']}
                        rules={[{ required: true, message: '姓名必填' }]}
                      >
                        <Input placeholder="姓名" style={{ width: 150 }} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'department']}>
                        <AutoComplete
                          placeholder="部门（可选）"
                          style={{ width: 180 }}
                          options={departments.map((d) => ({ label: d, value: d }))}
                          filterOption={(input, option) =>
                            (option?.value as string)
                              ?.toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={fields.length <= 1}
                        onClick={() => remove(field.name)}
                      />
                    </Space>
                  ))}
                </div>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                  disabled={fields.length >= MAX_ROWS}
                  onClick={() => add({})}
                >
                  添加一行（{fields.length}/{MAX_ROWS}）
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      )}
    </Modal>
  );
};

export default BatchCreateModal;
