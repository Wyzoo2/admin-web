# 焚信 BurnMsg 管理后台（admin-web）

企业加密通讯平台「焚信 BurnMsg」的后台管理系统 Web 前端，纯前端工程，对接 NestJS 后端 API v2.0.0。

## 技术栈

- React 18 + TypeScript + Vite
- Ant Design 5 + @ant-design/icons
- react-router-dom 6 / axios / zustand / dayjs

## 功能范围（对齐后端 admin 接口）

- 管理员登录（仅 `admin` 角色可进入；首登 `force_change_pwd` 自动跳转改密）
- token 自动刷新（401 时用 refresh_token 静默换新并重试）
- 账号管理：
  - 分页列表（手机号/姓名模糊搜索、部门筛选、状态筛选）
  - 开通单个账号（初始密码可指定或自动生成，生成结果仅显示一次）
  - 批量开通（页面内逐行录入，上限 500 条）
  - Excel 批量导入（.xlsx，≤5MB）
  - 重置密码（可指定或自动生成，生成结果仅显示一次）
  - 启用/停用（停用即全端强制下线）
  - 账号详情
- 修改本人密码

> 任务书中的「审计日志、组织架构部门树」在后端接口文档 v2.0.0 中尚无对应接口，待后端补接口后再扩展。

## 启动命令

```bash
cd D:\Burning_Inquiry\admin-web
npm install
npm run dev
```

启动后浏览器访问：http://localhost:5173

## 默认登录账号

登录页已预填（可直接在页面上修改）：

- 手机号：`13800000000`
- 密码：`123456`

注意：该账号必须在后端真实存在且角色为 `admin` 才能登录成功。

## 后端地址配置

编辑 `.env`：

```
VITE_API_BASE_URL=http://192.168.9.118:9091/api/v1
```

修改后需重启 `npm run dev` 生效。

## 目录结构

```
admin-web/
├── src/
│   ├── api/            # axios 封装（统一响应解包、token 刷新）+ auth/account 接口
│   ├── layouts/        # 管理后台布局（侧边菜单 + 顶栏用户下拉）
│   ├── pages/
│   │   ├── login/      # 登录页（默认账号预填）
│   │   ├── accounts/   # 账号管理（列表 + 开通/批量/导入/重置/详情）
│   │   └── profile/    # 修改密码
│   ├── router/         # 路由与登录守卫
│   ├── store/          # zustand 登录态
│   └── types/          # 与后端对齐的 TS 类型
├── .env                # 后端 API 地址
└── vite.config.ts
```

## 构建

```bash
npm run build
```

产物输出到 `dist/`，由任意静态服务器（如 Nginx）托管即可。
