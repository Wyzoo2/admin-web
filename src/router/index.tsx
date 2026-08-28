import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Login from '../pages/login/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import AccountList from '../pages/accounts/AccountList';
import AuditLog from '../pages/audit/AuditLog';
import GroupList from '../pages/groups/GroupList';
import AnnouncementList from '../pages/announcements/AnnouncementList';
import ChangePassword from '../pages/profile/ChangePassword';
import { tokenStore } from '../api/request';

/**
 * 路由守卫（登录拦截）
 *
 * 作用：包裹所有需要登录后才能访问的受保护路由。
 * 原理：每次渲染受保护路由前，先检查 localStorage 中是否存在 access_token：
 *   - 无 token：用 <Navigate> 重定向到 /login（replace 模式，不留历史记录，
 *     用户点浏览器"后退"不会回到被拦截页面）
 *   - 有 token：渲染 <Outlet />，即放行到子路由对应的页面组件
 *
 * 注意：这里只校验 token"存在性"，token 是否过期由 request.ts 的
 * 响应拦截器处理（401 时自动用 refresh_token 刷新，刷新失败再跳登录页），
 * 两者职责分离，避免每次跳转路由都请求后端校验。
 */
function RequireAuth() {
  // 无 token → 重定向到登录页；有 token → 放行渲染子路由
  if (!tokenStore.access) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  // 登录页：公开路由，不需要 token
  { path: '/login', element: <Login /> },
  // 受保护区域：先经过 RequireAuth 守卫，未登录统一拦截到 /login
  {
    element: <RequireAuth />,
    children: [
      {
        // 通过守卫后挂载后台整体布局（侧边菜单 + 顶栏），子页面渲染在其 <Outlet /> 中
        element: <AdminLayout />,
        children: [
          // 根路径默认跳转到仪表盘
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/accounts', element: <AccountList /> },
          { path: '/groups', element: <GroupList /> },
          { path: '/announcements', element: <AnnouncementList /> },
          { path: '/audit-logs', element: <AuditLog /> },
          { path: '/change-password', element: <ChangePassword /> },
        ],
      },
    ],
  },
  // 兜底：未匹配路径回到根路径（再由根路径决定是否跳登录页）
  { path: '*', element: <Navigate to="/" replace /> },
]);
