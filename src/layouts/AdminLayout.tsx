import { App, Avatar, Dropdown, Layout, Menu, Tooltip } from 'antd';
import {
  ApartmentOutlined,
  BarChartOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  DashboardOutlined,
  DesktopOutlined,
  FileTextOutlined,
  FireOutlined,
  KeyOutlined,
  LogoutOutlined,
  MessageOutlined,
  MoonOutlined,
  NotificationOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';

const { Header, Sider, Content } = Layout;

/**
 * 菜单 key 表，按「最长前缀优先」排序：
 * 前面是更长的路径前缀（如 /settings/retention），保证先于其它前缀命中。
 */
const MENU_KEYS = [
  '/settings/retention',
  '/destroy-records',
  '/read-stats',
  '/presence',
  '/messages',
  '/accounts',
  '/groups',
  '/announcements',
  '/feedback',
  '/versions',
  '/audit-logs',
  '/change-password',
] as const;

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';

  const selectedKey: string =
    MENU_KEYS.find(
      (k) => location.pathname === k || location.pathname.startsWith(k + '/'),
    ) ?? '/dashboard';

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Sider
        width={216}
        style={{
          background: 'var(--surface-alt)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* 品牌区 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              background: 'var(--accent)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: 'var(--text)',
            }}
          >
            焚信
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              letterSpacing: 0.5,
            }}
          >
            BurnMsg · 管理后台
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', padding: '10px 0' }}
          items={[
            { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
            { key: '/accounts', icon: <TeamOutlined />, label: '账号管理' },
            { key: '/messages', icon: <CommentOutlined />, label: '消息管理' },
            { key: '/destroy-records', icon: <FireOutlined />, label: '焚毁记录' },
            { key: '/read-stats', icon: <BarChartOutlined />, label: '已读统计' },
            { key: '/presence', icon: <DesktopOutlined />, label: '在线监控' },
            { key: '/groups', icon: <ApartmentOutlined />, label: '群组管理' },
            { key: '/announcements', icon: <NotificationOutlined />, label: '系统公告' },
            { key: '/feedback', icon: <MessageOutlined />, label: '意见反馈' },
            { key: '/versions', icon: <CloudUploadOutlined />, label: '版本管理' },
            { key: '/audit-logs', icon: <FileTextOutlined />, label: '审计日志' },
            { key: '/settings/retention', icon: <SettingOutlined />, label: '系统设置' },
            { key: '/change-password', icon: <KeyOutlined />, label: '修改密码' },
          ]}
        />
      </Sider>
      <Layout style={{ background: 'var(--bg)' }}>
        {/* 顶栏 */}
        <Header
          style={{
            background: 'var(--surface)',
            height: 56,
            padding: '0 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Tooltip title={isDark ? '切换到浅色' : '切换到深色'}>
            <button
              type="button"
              className="hdr-btn"
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              {isDark ? <MoonOutlined /> : <SunOutlined />}
            </button>
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                { key: 'pwd', icon: <KeyOutlined />, label: '修改密码' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout();
                if (key === 'pwd') navigate('/change-password');
              },
            }}
          >
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                padding: '4px 8px',
                borderRadius: 8,
                color: 'var(--text)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--surface-hover)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <Avatar
                size={28}
                icon={<UserOutlined />}
                src={user?.avatar_url || undefined}
                style={{ background: 'var(--accent-soft)', color: 'var(--text)' }}
              />
              <span>{user?.display_name || '管理员'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          className="fade-in"
          style={{ padding: 24, background: 'var(--bg)' }}
          key={location.pathname}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
