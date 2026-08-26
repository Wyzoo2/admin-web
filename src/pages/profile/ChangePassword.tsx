import { useMemo, useState } from 'react';
import { App, Button, Card, Divider, Form, Input, Tag } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

interface PwdFormValues {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/** 密码强度：0=空 1=弱 2=中 3=强 */
function calcStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[a-zA-Z]/.test(pwd) && /\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd) || pwd.length >= 12) s++;
  return Math.min(s, 3) as 0 | 1 | 2 | 3;
}

const STRENGTH_LABEL = ['', '弱', '中', '强'];
const STRENGTH_COLOR = ['', '#e5484d', '#f5a623', '#30a46c'];

const ChangePassword: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<PwdFormValues>();
  const newPwd = Form.useWatch('new_password', form) ?? '';

  const strength = useMemo(() => calcStrength(newPwd), [newPwd]);

  const requirements = useMemo(
    () => [
      { label: '至少 8 位字符', met: newPwd.length >= 8 },
      { label: '包含字母和数字', met: /[a-zA-Z]/.test(newPwd) && /\d/.test(newPwd) },
      { label: '包含特殊符号或长度 ≥ 12', met: /[^a-zA-Z0-9]/.test(newPwd) || newPwd.length >= 12 },
    ],
    [newPwd],
  );

  const onFinish = async (values: PwdFormValues) => {
    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      message.success('密码修改成功');
      if (user?.force_change_pwd) {
        setUser({ ...user, force_change_pwd: false });
        navigate('/', { replace: true });
      }
    } catch (e: any) {
      message.error(e.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="修改密码"
    >
      {/* ── 账号信息区 ── */}
      <div className="cp-section">
        <div className="cp-section-title">账号信息</div>
        <div className="cp-info-grid">
          <div className="cp-info-item">
            <span className="cp-info-label">当前账号</span>
            <span className="cp-info-value cell-mono">{user?.phone || '-'}</span>
          </div>
          <div className="cp-info-item">
            <span className="cp-info-label">角色</span>
            <span className="cp-info-value">
              {user?.role === 'admin' ? (
                <Tag className="tag-solid">管理员</Tag>
              ) : (
                <Tag>成员</Tag>
              )}
            </span>
          </div>
          <div className="cp-info-item">
            <span className="cp-info-label">显示名称</span>
            <span className="cp-info-value">{user?.display_name || '-'}</span>
          </div>
        </div>
      </div>

      <Divider style={{ margin: '20px 0' }} />

      {/* ── 修改密码区 ── */}
      <div className="cp-section">
        <div className="cp-section-title">修改密码</div>
        <Form<PwdFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ maxWidth: 480 }}
        >
          <Form.Item
            name="old_password"
            label={<span className="cp-label">原密码</span>}
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="cp-prefix-icon" />}
              placeholder="请输入原密码"
            />
          </Form.Item>

          <Form.Item
            name="new_password"
            label={<span className="cp-label">新密码</span>}
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '新密码至少 8 位' },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="cp-prefix-icon" />}
              placeholder="至少 8 位，含字母和数字"
            />
          </Form.Item>

          {/* 密码强度 */}
          {newPwd.length > 0 && (
            <div className="cp-strength">
              <div className="cp-strength-bar">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="cp-strength-seg"
                    style={{
                      background: strength >= i ? STRENGTH_COLOR[strength] : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <span className="cp-strength-label" style={{ color: STRENGTH_COLOR[strength] }}>
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
          )}

          {/* 密码要求列表 */}
          <ul className="cp-req-list">
            {requirements.map((r) => (
              <li key={r.label} className={r.met ? 'cp-req-met' : ''}>
                <span className="cp-req-dot" />
                {r.label}
              </li>
            ))}
          </ul>

          <Form.Item
            name="confirm_password"
            label={<span className="cp-label">确认新密码</span>}
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined className="cp-prefix-icon" />}
              placeholder="再次输入新密码"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                style={{ marginLeft: 16 }}
                htmlType="button"
                size="large"
                onClick={() => form.resetFields()}
                disabled={loading}
              >
                重置
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ marginLeft: 16,boxShadow:'0 0 0' }} >
                确认修改
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
};

export default ChangePassword;
