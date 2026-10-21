import { useEffect, useRef, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { accountApi } from '../../../api/account';
import { presenceApi } from '../../../api/admin';
import type { SafeUser } from '../../../types';
import type { PresenceDevice } from '../../../types/admin';
import IdText from '../../../components/IdText';
import { useAuthStore } from '../../../store/auth';

interface Props {
  id: string | null;
  /** 当前行手机号：服务端按 keyword 过滤设备，缺它就不发请求 */
  phone: string | null;
  onClose: () => void;
}

const fmt = (v?: string | null) =>
  v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-';

const EMPTY = '—';

/** 相对时间只用于 Tooltip，不引 dayjs 插件，按毫秒差换算 */
const fmtRelative = (v?: string | null) => {
  if (!v) return EMPTY;
  const t = dayjs(v);
  if (!t.isValid()) return EMPTY;
  const minutes = Math.floor((dayjs().valueOf() - t.valueOf()) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
};

/** 设备类型元数据；用宽索引签名容纳后端新增类型，越界时降级为原始值 */
const DEVICE_TYPE_META: Record<string, { label: string; color: string } | undefined> =
  {
    mobile: { label: '手机', color: 'blue' },
    desktop: { label: '桌面', color: 'default' },
    tablet: { label: '平板', color: 'cyan' },
    web: { label: '网页', color: 'purple' },
  };

/** 后端 devices 接口 pageSize 上限（101 直接 400），故固定 100 */
const DEVICE_PAGE_SIZE = 100;

/** 列宽之和必须等于 scroll.x（见 DEVICE_TABLE_WIDTH） */
const DEVICE_TABLE_WIDTH = 136 + 76 + 130 + 104 + 152 + 132;

/** 单行省略：表格里任何超长文本都不许折行 */
const PRIMARY_STYLE: React.CSSProperties = {
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/**
 * 账号维度设备查询：后端没有 /accounts/:id/devices（实测 404），也没有按 user_id
 * 精确过滤的参数，但 v2.6.0 起 /admin/presence/devices 支持 keyword（服务端按
 * 手机号/昵称过滤），所以用手机号一次取回该用户设备，再按 user_id 精确过滤
 * （keyword 是模糊匹配，可能命中昵称相同的其他人）。必须显式 online_only=false：
 * 接口默认只回在线设备，否则「在线状态」恒为在线、离线记录整行缺失。
 */
async function fetchAccountDevices(
  userId: string,
  phone: string,
): Promise<PresenceDevice[]> {
  const res = await presenceApi.devices({
    online_only: false,
    keyword: phone,
    page: 1,
    pageSize: DEVICE_PAGE_SIZE,
  });
  return (res?.data ?? []).filter((d) => d.user_id === userId);
}

const AccountDetailDrawer: React.FC<Props> = ({ id, phone, onClose }) => {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SafeUser | null>(null);

  const [devices, setDevices] = useState<PresenceDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  /** 强制下线成功后自增，触发该账号设备列表重新拉取 */
  const [deviceReloadToken, setDeviceReloadToken] = useState(0);
  /** 只接受最后一次请求的结果，避免快速切换账号时旧响应覆盖新数据 */
  const deviceReqSeq = useRef(0);

  const [offlineTarget, setOfflineTarget] = useState<PresenceDevice | null>(
    null,
  );
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 当前登录设备的指纹：用于禁止下线本机（否则当前会话立刻失效） */
  const currentDeviceId = useAuthStore((s) => s.deviceId);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    accountApi
      .detail(id)
      .then(setDetail)
      .catch((e: unknown) =>
        message.error(e instanceof Error ? e.message : '加载详情失败'),
      )
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Drawer 的 open 即 !!id（调用方只传 id），无独立 open 属性
    const userId = id;
    // 没有 id 或没有手机号都不发请求：keyword 是唯一的服务端过滤入口
    if (!userId || !phone) {
      // 抽屉关闭：作废在途请求，避免它回来后又写入已关闭的列表
      deviceReqSeq.current += 1;
      setDevices([]);
      setDevicesLoading(false);
      setDeviceReloadToken(0);
      setOfflineTarget(null);
      return;
    }
    const seq = deviceReqSeq.current + 1;
    deviceReqSeq.current = seq;
    setDevicesLoading(true);
    fetchAccountDevices(userId, phone)
      .then((rows) => {
        if (deviceReqSeq.current !== seq) return;
        setDevices(rows);
      })
      .catch((e: unknown) => {
        if (deviceReqSeq.current !== seq) return;
        // 失败只提示，不影响抽屉里的账号信息
        setDevices([]);
        message.error(
          `该账号设备加载失败：${
            e instanceof Error && e.message ? e.message : '接口未就绪'
          }`,
        );
      })
      .finally(() => {
        if (deviceReqSeq.current === seq) setDevicesLoading(false);
      });
  }, [id, phone, deviceReloadToken, message]);

  const isCurrentDevice = (d: PresenceDevice) =>
    !!currentDeviceId && d.device_fingerprint === currentDeviceId;

  const offlineMatched =
    offlineTarget != null && typed.trim() === offlineTarget.id;

  const handleForceOffline = async () => {
    if (!offlineTarget || !offlineMatched || submitting) return;
    setSubmitting(true);
    try {
      const res = await presenceApi.forceOffline(offlineTarget.id);
      message.success(`设备 ${res?.device_id ?? offlineTarget.id} 已强制下线`);
      setOfflineTarget(null);
      setTyped('');
      setDeviceReloadToken((t) => t + 1);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '强制下线失败');
    } finally {
      setSubmitting(false);
    }
  };

  const deviceColumns: ColumnsType<PresenceDevice> = [
    {
      title: '设备名称',
      dataIndex: 'device_name',
      width: 136,
      render: (v: string | null, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {v ? (
            <Tooltip title={v} mouseEnterDelay={0.3}>
              <span style={PRIMARY_STYLE}>{v}</span>
            </Tooltip>
          ) : (
            <span style={{ color: 'var(--text-3)' }}>{EMPTY}</span>
          )}
          {isCurrentDevice(row) && (
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              当前设备
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'device_type',
      width: 76,
      render: (v: string) => {
        const meta = DEVICE_TYPE_META[v];
        return meta ? (
          <Tag color={meta.color}>{meta.label}</Tag>
        ) : (
          <Tag>{v || EMPTY}</Tag>
        );
      },
    },
    {
      title: '设备指纹',
      dataIndex: 'device_fingerprint',
      width: 130,
      // 36 位指纹整段渲染会折行：单行省略 + 悬停全文 + 点击复制
      render: (v: string | null) => <IdText value={v} />,
    },
    {
      title: '在线状态',
      dataIndex: 'is_online',
      width: 104,
      render: (v: boolean) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {v ? (
            <Badge status="success" text="在线" />
          ) : (
            <Badge status="default" text="离线" />
          )}
        </span>
      ),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      width: 152,
      render: (v: string | null) => (
        <Tooltip title={`相对时间：${fmtRelative(v)}`} mouseEnterDelay={0.3}>
          <span
            style={{
              whiteSpace: 'nowrap',
              color: v ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {v ? fmt(v) : EMPTY}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 132,
      render: (_, row) => {
        const isCurrent = isCurrentDevice(row);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* disabled 按钮不触发鼠标事件，外层 span 承接 Tooltip */}
            <Tooltip
              title={
                isCurrent
                  ? '当前设备不能强制下线（下线自己会让当前会话立即失效）'
                  : `将踢下线：${row.device_name || row.id}`
              }
              mouseEnterDelay={0.2}
            >
              <span
                style={{
                  display: 'inline-block',
                  cursor: isCurrent ? 'not-allowed' : 'default',
                }}
              >
                <Button
                  size="small"
                  danger
                  disabled={isCurrent}
                  onClick={() => {
                    setTyped('');
                    setOfflineTarget(row);
                  }}
                >
                  强制下线
                </Button>
              </span>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Drawer
        title="账号详情"
        open={!!id}
        onClose={onClose}
        width={800}
        destroyOnHidden
      >
        <Spin spinning={loading}>
          {detail && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="用户 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="姓名">
                {detail.display_name}
              </Descriptions.Item>
              <Descriptions.Item label="部门">
                {detail.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="角色">
                {detail.role === 'admin' ? (
                  <Tag color="gold">管理员</Tag>
                ) : (
                  <Tag>成员</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {detail.status === 'active' ? (
                  <Tag color="success">正常</Tag>
                ) : (
                  <Tag color="error">已停用</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="待强制改密">
                {detail.force_change_pwd ? (
                  <Tag color="warning">是</Tag>
                ) : (
                  '否'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="签名">
                {detail.signature || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {fmt(detail.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {fmt(detail.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Spin>

        {id && (
          <>
            <Divider orientation="left" style={{ margin: '20px 0 12px' }}>
              <span
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}
              >
                该账号设备
              </span>
            </Divider>

            <Table<PresenceDevice>
              rowKey="id"
              size="small"
              columns={deviceColumns}
              dataSource={devices}
              loading={devicesLoading}
              pagination={false}
              scroll={{ x: DEVICE_TABLE_WIDTH }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      phone ? '该账号暂无设备记录' : '缺少手机号，无法查询该账号设备'
                    }
                  />
                ),
              }}
            />
          </>
        )}
      </Drawer>

      <Modal
        open={offlineTarget != null}
        title="强制下线设备"
        okText="确认下线"
        cancelText="取消"
        confirmLoading={submitting}
        okButtonProps={{ danger: true, disabled: !offlineMatched }}
        onOk={() => {
          void handleForceOffline();
        }}
        onCancel={() => {
          setOfflineTarget(null);
          setTyped('');
        }}
      >
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            color: 'var(--text-2)',
            marginBottom: 14,
          }}
        >
          被踢设备下次请求将
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            立即返回 401
          </span>
          ，需要重新登录。该动作不可撤销，并会写入审计日志（
          <span className="cell-mono">admin_force_offline_device</span>）。
        </div>

        <div
          style={{
            padding: '10px 12px',
            marginBottom: 14,
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.9,
          }}
        >
          <div>用户：{detail?.display_name || detail?.phone || EMPTY}</div>
          <div>设备名称：{offlineTarget?.device_name || EMPTY}</div>
          <div>
            设备记录 ID：<IdText value={offlineTarget?.id} />
          </div>
          <div>
            设备指纹（仅核对用）：<IdText value={offlineTarget?.device_fingerprint} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
          为避免误操作，请输入上方「设备记录 ID（不是设备指纹）」→ 一致后才能提交：
        </div>
        <Input
          value={typed}
          placeholder="输入设备记录 ID"
          className="cell-mono"
          allowClear
          onChange={(e) => setTyped(e.target.value)}
          onPressEnter={() => {
            void handleForceOffline();
          }}
        />
        {typed.length > 0 && !offlineMatched && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
            设备记录 ID 不匹配，无法提交
          </div>
        )}
      </Modal>
    </>
  );
};

export default AccountDetailDrawer;
