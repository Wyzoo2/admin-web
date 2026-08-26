import { useState } from 'react';
import { App, Button, Checkbox, Form, Input, Tooltip } from 'antd';
import { LockOutlined, MoonOutlined, PhoneOutlined, SunOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';

/** 默认登录账号（可在下方表单中直接修改） */
const DEFAULT_ACCOUNT = {
  phone: '13800000000',
  password: '123456',
};

const REMEMBER_KEY = 'burnmsg_remembered_account';

interface LoginFormValues {
  phone: string;
  password: string;
  remember: boolean;
}

function loadRemembered(): Partial<LoginFormValues> {
  try {
    const s = localStorage.getItem(REMEMBER_KEY);
    if (s) return { ...JSON.parse(s), remember: true };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_ACCOUNT, remember: true };
}

const Login: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);

  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await login({
        phone: values.phone,
        password: values.password,
        device_name: 'BurnMsg 管理后台 Web',
        device_type: 'web',
      });

      // 后台管理系统仅允许 admin 角色进入
      if (res.user.role !== 'admin') {
        logout();
        message.error('该账号不是管理员，无法登录管理后台');
        return;
      }

      if (values.remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ phone: values.phone, password: values.password }),
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      if (res.force_change_pwd) {
        message.warning('首次登录请先修改初始密码');
        navigate('/change-password', { replace: true });
      } else {
        message.success(`欢迎回来，${res.user.display_name}`);
        navigate('/', { replace: true });
      }
    } catch (e: any) {
      message.error(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg)',
        position: 'relative',
      }}
    >
      {/* 主题切换（右上角） */}
      <Tooltip title={isDark ? '切换到浅色' : '切换到深色'}>
        <button
          type="button"
          className="hdr-btn"
          onClick={toggleTheme}
          aria-label="切换主题"
          style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36 }}
        >
          {isDark ? <SunOutlined /> : <MoonOutlined />}
        </button>
      </Tooltip>

      {/* 左侧品牌区 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 7vw',
          background: 'var(--surface-alt)',
          borderRight: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰性几何点纹，呼应阅后即焚的"信号/像素"意象 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(var(--border) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            opacity: 0.6,
            maskImage:
              'radial-gradient(circle at 30% 40%, black 0%, transparent 70%)',
            WebkitMaskImage:
              'radial-gradient(circle at 30% 40%, black 0%, transparent 70%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <span
              style={{
                width: 14,
                height: 14,
                background: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'var(--text)',
              }}
            >
              焚信
            </span>
          </div>
          <h1
            style={{
              fontSize: 38,
              lineHeight: 1.25,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: 'var(--text)',
              margin: '0 0 18px',
            }}
          >
            阅后即焚的
            <br />
            企业加密通讯
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              color: 'var(--text-2)',
              margin: 0,
              maxWidth: 360,
            }}
          >
            端到端加密 · 设备级管控 · 消息阅后即焚。
            <br />
            管理后台用于账号开通、状态管理与安全审计。
          </p>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div
        style={{
          width: 460,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--text)',
                margin: '0 0 6px',
              }}
            >
              欢迎回来
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
              使用管理员账号登录
            </p>
          </div>

          <Form<LoginFormValues>
            layout="vertical"
            initialValues={loadRemembered()}
            onFinish={onFinish}
            requiredMark={false}
          >
            <Form.Item
              name="phone"
              label={<span style={{ fontSize: 12, color: 'var(--text-2)' }}>手机号</span>}
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
              ]}
            >
              <Input
                size="large"
                prefix={<PhoneOutlined style={{ color: 'var(--text-3)' }} />}
                placeholder="手机号即用户名"
                maxLength={11}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span style={{ fontSize: 12, color: 'var(--text-2)' }}>密码</span>}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: 'var(--text-3)' }} />}
                placeholder="请输入密码"
              />
            </Form.Item>
            <Form.Item name="remember" valuePropName="checked">
              <Checkbox style={{ fontSize: 12, color: 'var(--text-2)' }}>
                记住账号密码（保存在本机浏览器）
              </Checkbox>
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 11,
              marginTop: 24,
              letterSpacing: 0.5,
            }}
          >
            账号由管理员统一开通 · 不开自助注册
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
