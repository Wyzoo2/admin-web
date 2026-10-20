# 焚信 BurnMsg 管理后台（admin-web）

企业加密通讯平台「焚信 BurnMsg」的后台管理前端：纯前端 SPA，对接 NestJS 后端
`/api/v1`。除账号/群组/公告/反馈/版本等基础管理外，本项目还承载焚毁 V6.0
（消息焚毁记录、待真删队列、已读统计）与在线状态（在线监控、强制下线）两套新能力。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript 5.6（`strict`） |
| 构建 | Vite 5 |
| UI | Ant Design 5 + @ant-design/icons（中文包 `zh_CN`） |
| 路由 / 状态 | react-router-dom 6（`createBrowserRouter`） / zustand 4 |
| 请求 / 时间 | axios 1（统一封装 + 401 静默续期） / dayjs |

零额外依赖：图表用纯 CSS 条形，Excel 模板 base64 内嵌，表格与抽屉均为 AntD 原生组件。

## 快速开始

```bash
cd D:\Burning_Inquiry\admin-web
npm install
npm run dev      # http://localhost:5173
```

| 脚本 | 作用 |
|---|---|
| `npm run dev` | Vite 开发服务器（`host: true`，局域网可访问） |
| `npm run build` | `tsc -b` 类型检查 + 生产构建，产物在 `dist/` |
| `npm run preview` | 预览构建产物 |

后端地址在 `.env` 中配置，修改后需重启 dev server：

```
VITE_API_BASE_URL=http://192.168.9.105:9091/api/v1
```

> `.env` 目前随仓库提交（内网地址），换环境时记得同步修改；若后续改为多环境部署，
> 建议改用 `.env.local` + 提交一份 `.env.example`。

登录账号必须是后端 `app_users.role = 'admin'` 的账号；登录页预填了手机号，
密码由后端分配。首登被标记 `force_change_pwd` 的账号会强制跳转改密页。

## 功能地图

| 菜单 | 路由 | 说明 | 归属 |
|---|---|---|---|
| 仪表盘 | `/dashboard` | 账号/消息/群组/存储 12 项指标 + 焚毁 V6.0 分区（在线用户、在线设备、今日焚毁、待真删）+ 今日焚毁原因分布与平均存活时长 | 基础 + V6 |
| 账号管理 | `/accounts` | 列表（手机号/姓名/部门/状态筛选）、单个开通、批量开通、Excel 导入（≤5MB）、重置密码、启用/停用、详情、CSV 导出 | 基础 |
| 消息管理 | `/messages` | 消息检索（会话/发送人/消息类型/关键词/时间段/仅焚毁/仅已焚毁）、详情抽屉（回执明细 + 焚毁状态 + 真删墓碑）、手动焚毁（需手输消息 ID） | V6 |
| 焚毁记录 | `/destroy-records` | 销毁流水（阶段/会话类型/原因/存活时长，CSV 导出）+ 待真删队列（确认进度、应真删时间） | V6 |
| 已读统计 | `/read-stats` | 会话维度（成员已读/未读/已读率）+ 消息维度（应读/已读/已点开 + 读者明细），内置最近会话/最近消息快捷入口 | V6 |
| 在线监控 | `/presence` | 在线概览（在线用户/设备/全部设备/疑似失联 + 按设备类型）、设备列表、强制下线（需手输设备记录 ID） | V6 |
| 群组管理 | `/groups` | 群组/频道列表、创建、群资料、成员增删与角色、管理员强制解散 | 基础 |
| 系统公告 | `/announcements` | 发布（优先级/定向部门）、列表（含已读数）、删除 | 基础 |
| 意见反馈 | `/feedback` | 列表、回复（回复即置为已处理） | 基础 |
| 版本管理 | `/versions` | APK 上传发版、撤回/恢复、强更开关、更新说明、删除 | 基础 |
| 审计日志 | `/audit-logs` | 多条件查询 + CSV 导出；动作含 `device_limit_exceeded`、`admin_manual_destroy_message` 等 | 基础 |
| 系统设置 | `/settings/retention` | 数据保留策略（确认回退天数、真删阈值、焚毁兜底时长、在线 TTL），当前后端只读 | V6 |
| 修改密码 | `/change-password` | 本人改密（含强度提示） | 基础 |

## 与后端的契约

### 统一约定

- 响应体：`{ code: 0, message, data }`。`request.ts` 的响应拦截器直接返回 `data`，
  因此调用方写 `request.get<unknown, T>(...)`，拿到的就是业务对象。
- 鉴权：`Authorization: Bearer <access_token>`；token 存 `localStorage`
  （`burnmsg_access_token` / `burnmsg_refresh_token`）。
- 401：非 `/auth/*` 请求会用 `refresh_token` 静默换新并重试一次（并发请求复用同一个
  Promise）；刷新失败则清 token 跳 `/login`。
- 新开通账号 `force_change_pwd = true` 时，后端会拒绝除 `/auth/change-password`
  以外的全部接口（403「请先修改初始密码后再使用其他功能」），前端据此跳改密页。
- **分页上限**：`/admin/*` 端点 `pageSize ≤ 100`（101 直接 400）；`/accounts`、
  `/audit-logs` 允许 200。前端下拉选项与导出翻页均已按上限收敛。

### 接口分组

| 模块 | 端点 |
|---|---|
| 认证 | `POST /auth/login`、`GET /auth/profile`、`POST /auth/change-password`、`POST /auth/refresh-token` |
| 账号 | `GET/POST /accounts`、`GET /accounts/:id`、`GET /accounts/departments`、`POST /accounts/batch`、`POST /accounts/import`、`POST /accounts/:id/reset-password`、`POST /accounts/:id/toggle-status`、`DELETE /accounts/:id` |
| 群组 | `GET /groups/admin/all`、`POST /groups`、`PUT /groups/:id`、`GET/POST /groups/:id/members`、`DELETE /groups/:id/members/:userId`、`PUT /groups/:id/members/:userId/role`、`DELETE /groups/admin/:id` |
| 公告 / 反馈 | `GET /announcements/manage`、`POST /announcements`、`DELETE /announcements/:id`；`GET /feedback/admin/all`、`PUT /feedback/admin/:id/reply` |
| 版本 | `GET /app-versions/manage`、`POST /app-versions`、`PATCH /app-versions/:id`、`DELETE /app-versions/:id` |
| 审计 / 统计 | `GET /audit-logs`、`GET /stats/overview` |
| 消息管理（V6） | `GET /admin/messages`、`GET /admin/messages/:id`、`POST /admin/messages/:id/destroy` |
| 焚毁记录（V6） | `GET /admin/destroy-records`（`stage=pending_purge` 切换到待真删队列，两视图 item 同构） |
| 已读统计（V6） | `GET /admin/read-stats/conversations/:id`、`GET /admin/read-stats/messages/:id` |
| 在线监控（V6） | `GET /admin/presence/overview`、`GET /admin/presence/devices`、`POST /admin/devices/:deviceId/offline` |
| 保留策略（V6） | `GET /admin/settings/retention`（`PUT` 后端未实现） |

### 后端实现与设计文档的差异（前端已按实测适配）

| 差异 | 实际行为 | 前端处理 |
|---|---|---|
| 消息详情回执 | `receipts` 是**数组**，另有 `acked_count`、`tombstone` | 由数组前端派生应读/已读/已点开/已焚毁四项汇总 + 回执明细表 |
| 在线概览字段 | 是 `online_by_type: [{device_type,count}]`，另含 `total_devices`、`stale_online_devices` | 按数组渲染类型分布 |
| 设备列表字段 | `display_name` / `phone` / `device_fingerprint`，无 IP | 表头为「设备指纹」，不展示 IP 列 |
| 强制下线参数 | 路径参数是**设备记录 id**，不是设备指纹 | 二次确认要求手输设备记录 ID，并在弹框内同时展示指纹供核对 |
| 已读统计 | 无 `member_count` / 逐条消息已读率；消息维度无 `burned` | 用 `message_total` + 成员 `read_rate`，并在页面注明后端未提供逐条已读率 |
| 保留策略 | `editable: false`，`PUT` 返回 404（由 env 驱动，需重启） | 表单只读 + 展示后端 `note`，绝不调用 PUT |
| 焚毁原因枚举 | 仅 `fallback_expired/all_read/owner_dissolve/admin_dissolve/manual` | 筛选项不含 `admin_manual`（传了会 400）；`admin_manual` 仅作历史展示兜底 |
| 审计动作名 | `admin_manual_destroy_message`、`admin_force_offline_device`、`device_limit_exceeded`、`session_kicked_by_new_login` | 均已在审计页配中文标签 |
| 解散群与焚毁 | 群主解散不会把群内消息标记为 `owner_dissolve` | 页面按后端返回值渲染，不做假设 |

## 目录结构

```
admin-web/
├─ src/
│  ├─ api/            # axios 封装（统一响应解包、401 续期）与各模块接口
│  │   ├─ request.ts
│  │   ├─ account.ts / auth.ts / group.ts / announcement.ts / feedback.ts / version.ts / audit.ts / stats.ts
│  │   └─ admin.ts    # 焚毁 V6 + 在线状态（/admin/*）
│  ├─ components/     # 跨页面共享组件（IdText：长 ID 单行省略 + 点击复制）
│  ├─ layouts/        # AdminLayout：侧边菜单 + 顶栏（主题切换、用户下拉）
│  ├─ pages/
│  │   ├─ dashboard/ accounts/ groups/ announcements/ feedback/ versions/ audit/ login/ profile/
│  │   └─ messages/ destroy-records/ read-stats/ presence/ settings/     # V6 新增
│  ├─ router/         # createBrowserRouter + RequireAuth 守卫 + v7 future flags
│  ├─ store/          # auth（登录态）、theme（明暗主题）
│  ├─ types/          # 与后端对齐的类型（index.ts 基础域、admin.ts V6 域）
│  ├─ App.tsx         # ConfigProvider 主题令牌 + RouterProvider
│  ├─ index.css       # CSS 变量与 AntD 细节覆写（明暗双主题）
│  └─ main.tsx
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
└─ .env               # VITE_API_BASE_URL
```

## 开发约定

- **主题**：颜色一律用 `index.css` 里的 CSS 变量（`--bg/--surface/--text/--text-2/--text-3/--border/--accent/--danger`…），
  禁止写死 hex；`data-theme` 切换明暗，首次访问跟随系统偏好。AntD 令牌集中在 `App.tsx`。
- **时间与空值**：时间统一 `dayjs(x).format('YYYY-MM-DD HH:mm:ss')`，空值渲染淡色 `—`。
- **长 ID**：UUID 一律用 `<IdText value={...} />`（单行「前 8…后 6」+ 悬停全文 + 点击复制），
  避免 36 位 UUID 折行把表格行高撞乱。需要用户手抄 ID 的二次确认弹框是例外（必须显示全文）。
- **表格**：`rowKey` 用真实主键（`id` / `message_id`）；`scroll.x` 必须等于各列 `width` 之和；
  不使用 `fixed` 列（会遮挡相邻列）；主信息 13px、次信息 11px，单元格最多两行，第三类信息进 Tooltip。
- **筛选栏**：紧凑工具栏（固定宽度 + `flex-wrap`），不要用栅格 + `width:100%` 把短字段拉宽。
- **错误处理**：请求失败统一 `catch (e: unknown)` + `message.error(e instanceof Error ? e.message : '请求失败')`，
  失败时保留已加载数据，不清空表格；降级提示不阻塞主流程。
- **表单**：批量/写操作均有二次确认；手动焚毁与强制下线要求手输目标 ID，防误操作。

## 开发与验收

目前没有自动化测试与 ESLint 配置，提交前至少保证：

```bash
npx tsc --noEmit     # 0 错误
npx vite build       # 构建通过（当前单 chunk 约 1.5MB，见下）
```

页面级验证建议用无头浏览器跑一轮真实回归（登录 → 逐菜单 → 关键交互），
重点看：控制台是否有 warning/error、接口是否有 4xx/5xx、表格是否出现 `NaN`/`undefined`、
明暗两套主题下文字与标签是否可读。

## 已知问题与后续计划

1. **构建体积**：单 chunk ≈ 1.5MB（gzip ≈ 490KB）。建议对路由用 `React.lazy()` 拆分，
   或配置 `build.rollupOptions.output.manualChunks` 把 AntD 单独分包。
2. **工具函数重复**：`messages` 与 `destroy-records` 各自带了 `formatDateTime`/`formatDuration`
   等实现（时长文案略有差异，如「5 分钟」与「5 分」）。建议收敛到 `src/utils/format.ts`。
3. **无测试/无 lint**：建议补 Vitest + Testing Library 覆盖接口解包与关键页面交互，
   并加 ESLint（`eslint.config.js`）与 Prettier。
4. **`.env` 入库**：内网地址随仓库提交，多环境时易冲突，建议改 `.env.local` + `.env.example`。
5. **保留策略页**：后端 `PUT /admin/settings/retention` 未实现，页面目前只读；
   后端落地后放开保存即可（代码分支已就绪）。
6. **窄屏表格**：列数较多（消息 9 列 / 焚毁流水 10 列），1440 及以下需表内横向滚动；
   如需优化可按断点隐藏次要列。
