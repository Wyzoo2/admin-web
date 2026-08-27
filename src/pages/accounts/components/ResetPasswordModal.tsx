import { useEffect, useState } from 'react';
import { App, Form, Input, Modal, Typography } from 'antd';
import { accountApi } from '../../../api/account';
import type { SafeUser } from '../../../types';

interface Props {
  target: SafeUser | null;
  onClose: () => void;
}

interface FormValues {
  new_password?: string;
}

const ResetPasswordModal: React.FC<Props> = ({ target, onClose }) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target) form.resetFields();
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOk = async () => {
    if (!target) return;
    const values = await form.validateFields();
    setLoading(true);
    try {
      const res = await accountApi.resetPassword(
        target.id,
        values.new_password || undefined,
      );
      const newPwd = res?.new_password;
      if (newPwd) {
        // 自动生成的新密码仅本次可见
        modal.success({
          title: '密码已重置',
          width: 480,
          content: (
            <div style={{ marginTop: 12 }}>
              <p>
                账号：{target.display_name}（{target.phone}）
              </p>
              <p>
                新密码：
                <Typography.Paragraph
                  copyable
                  strong
                  className="cell-mono"
                  style={{ display: 'inline', color: 'var(--text)' }}
                >
                  {newPwd}
                </Typography.Paragraph>
              </p>
              <p style={{ color: 'var(--text)', fontWeight: 600 }}>
                该密码仅本次显示，请立即复制并通过安全渠道告知员工；员工首次登录需强制改密。
              </p>
            </div>
          ),
        });
      } else {
        message.success('密码已重置');
      }
      onClose();
    } catch (e: any) {
      message.error(e.message || '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="重置密码"
      open={!!target}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="重置"
      cancelText="取消"
      destroyOnHidden
    >
      {target && (
        <p style={{ color: 'var(--text-2)' }}>
          目标账号：{target.display_name}（{target.phone}）
        </p>
      )}
      <Form<FormValues> form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="new_password"
          label="新密码（可选）"
          rules={[{ min: 8, message: '密码至少 8 位' }]}
          extra="留空则由系统随机生成，仅在重置成功时显示一次"
        >
          <Input.Password placeholder="留空自动生成随机密码" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ResetPasswordModal;
