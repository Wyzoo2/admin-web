import { useState } from 'react';
import { App, AutoComplete, Form, Input, Modal, Typography } from 'antd';
import { accountApi } from '../../../api/account';

interface Props {
  open: boolean;
  departments: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  phone: string;
  display_name: string;
  department?: string;
  password?: string;
}

const CreateAccountModal: React.FC<Props> = ({
  open,
  departments,
  onClose,
  onSuccess,
}) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const res = await accountApi.create({
        phone: values.phone,
        display_name: values.display_name,
        department: values.department || undefined,
        password: values.password || undefined,
      });
      form.resetFields();
      onSuccess();

      if (res.initial_password) {
        // 初始密码仅本次可见，服务端不留存明文
        modal.success({
          title: '账号开通成功',
          width: 480,
          content: (
            <div style={{ marginTop: 12 }}>
              <p>
                手机号：<Typography.Text strong>{res.phone}</Typography.Text>
              </p>
              <p>
                初始密码：
                <Typography.Paragraph
                  copyable
                  strong
                  className="cell-mono"
                  style={{ display: 'inline', color: 'var(--text)' }}
                >
                  {res.initial_password}
                </Typography.Paragraph>
              </p>
              <p style={{ color: 'var(--text)', fontWeight: 500 }}>
                该密码仅本次显示，请立即复制并通过安全渠道告知员工；员工首次登录需强制改密。
              </p>
            </div>
          ),
        });
      } else {
        message.success('账号开通成功');
      }
      onClose();
    } catch (e: any) {
      message.error(e.message || '开通失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="开通账号"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="开通"
      cancelText="取消"
      destroyOnClose
    >
      <Form<FormValues> form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="phone"
          label="手机号（即用户名）"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
          ]}
        >
          <Input placeholder="公司内部手机号" maxLength={11} />
        </Form.Item>
        <Form.Item
          name="display_name"
          label="姓名"
          rules={[
            { required: true, message: '请输入姓名' },
            { max: 100, message: '姓名最长 100 字符' },
          ]}
        >
          <Input placeholder="员工姓名" />
        </Form.Item>
        <Form.Item name="department" label="部门（可选）">
          <AutoComplete
            placeholder="选择已有部门或输入新部门"
            options={departments.map((d) => ({ label: d, value: d }))}
            filterOption={(input, option) =>
              (option?.value as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="初始密码（可选）"
          rules={[{ min: 8, message: '密码至少 8 位' }]}
          extra="留空则由系统随机生成，仅在创建成功时显示一次"
        >
          <Input.Password placeholder="留空自动生成随机密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateAccountModal;
