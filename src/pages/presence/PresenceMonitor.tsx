import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Badge, Button, Card, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { presenceApi } from '../../api/admin';
import type {
  PresenceDevice,
  PresenceDeviceQuery,
  PresenceOverview,
} from '../../types/admin';
import type { DeviceType } from '../../types';
import IdText from '../../components/IdText';
import DeviceTypeTag from './components/DeviceTypeTag';
import ForceOfflineModal from './components/ForceOfflineModal';
import PresenceFilters from './components/PresenceFilters';
import type { PresenceFilterState } from './components/PresenceFilters';
import PresenceOverviewCards from './components/PresenceOverviewCards';
import { useAuthStore } from '../../store/auth';

const EMPTY = '—';
/** 次信息（手机号等）统一 11px 次要色 */
const SECONDARY_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-3)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
/** 主信息单行：超长省略，禁止折行 */
const PRIMARY_STYLE: React.CSSProperties = {
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function formatAbsoluteTime(input?: string | null): string {
  if (!input) return EMPTY;
  const t = dayjs(input);
  return t.isValid() ? t.format('YYYY-MM-DD HH:mm:ss') : EMPTY;
}

/** 相对时间：不引入 dayjs relativeTime 插件，按毫秒差自行换算 */
function formatRelativeTime(input?: string | null): string {
  if (!input) return EMPTY;
  const t = dayjs(input);
  if (!t.isValid()) return EMPTY;
  const diffMinutes = Math.floor((dayjs().valueOf() - t.valueOf()) / 60000);
  if (diffMinutes < 0) return '刚刚';
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback;

const PresenceMonitor: React.FC = () => {
  const { message } = App.useApp();

  const [overview, setOverview] = useState<PresenceOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  /** 概览失败只提示一次，避免每次刷新刷屏 */
  const overviewErrorNotified = useRef(false);

  const [devices, setDevices] = useState<PresenceDevice[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<PresenceFilterState>({
    onlineOnly: true,
    deviceType: '',
    keyword: '',
  });

  const [offlineTarget, setOfflineTarget] = useState<PresenceDevice | null>(
    null,
  );

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await presenceApi.overview();
      setOverview(res ?? null);
      overviewErrorNotified.current = false;
    } catch (e) {
      if (!overviewErrorNotified.current) {
        overviewErrorNotified.current = true;
        message.error(
          `在线概览加载失败：${errorMessage(e, '接口未就绪')}`,
        );
      }
    } finally {
      setOverviewLoading(false);
    }
  }, [message]);

  const fetchDevices = useCallback(async () => {
    setListLoading(true);
    try {
      // 严格按契约传参：仅 online_only / device_type / page / pageSize
      const params: PresenceDeviceQuery = {
        online_only: filters.onlineOnly,
        page,
        pageSize,
      };
      if (filters.deviceType) params.device_type = filters.deviceType;
      const res = await presenceApi.devices(params);
      setDevices(res?.data ?? []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      // 失败保留旧数据，只提示
      message.error(
        `在线设备加载失败：${errorMessage(e, '接口未就绪')}`,
      );
    } finally {
      setListLoading(false);
    }
  }, [filters.onlineOnly, filters.deviceType, page, pageSize, message]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const refreshAll = useCallback(() => {
    void fetchDevices();
    void fetchOverview();
  }, [fetchDevices, fetchOverview]);

  const onFiltersChange = useCallback(
    (next: PresenceFilterState) => {
      // 服务端筛选条件变化时回到第一页；仅关键字变化不触发重新请求
      if (
        next.onlineOnly !== filters.onlineOnly ||
        next.deviceType !== filters.deviceType
      ) {
        setPage(1);
      }
      setFilters(next);
    },
    [filters.onlineOnly, filters.deviceType],
  );

  /** 关键字为客户端过滤，仅作用于当前页；只匹配后端真实返回的字段 */
  const visibleDevices = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    if (!kw) return devices;
    return devices.filter((row) =>
      [
        row.user_id,
        row.display_name,
        row.phone,
        row.id,
        row.device_fingerprint,
        row.device_name,
      ].some((v) => typeof v === 'string' && v.toLowerCase().includes(kw)),
    );
  }, [devices, filters.keyword]);

  // 只拦「当前设备」：登录时记下的设备指纹 vs 行上的 device_fingerprint
  const currentDeviceId = useAuthStore((s) => s.deviceId);
  const isCurrentDevice = useCallback(
    (row: PresenceDevice) =>
      !!currentDeviceId && row.device_fingerprint === currentDeviceId,
    [currentDeviceId],
  );

  const emptyText = useMemo(() => {
    const kw = filters.keyword.trim();
    if (kw && devices.length > 0) {
      return `没有匹配「${kw}」的设备（关键字为客户端过滤，仅作用于当前页）`;
    }
    if (filters.onlineOnly) return '当前无在线设备';
    return '暂无设备数据';
  }, [devices.length, filters.keyword, filters.onlineOnly]);

  /** 列宽之和必须等于 scroll.x（见 TABLE_WIDTH） */
  const columns: ColumnsType<PresenceDevice> = [
    {
      title: '用户',
      key: 'user',
      width: 180,
      render: (_, row) => {
        const name = row.display_name ?? row.user_id;
        return (
          <div style={{ lineHeight: 1.4, minWidth: 0 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
            >
              <Tooltip title={name} mouseEnterDelay={0.3}>
                <span style={PRIMARY_STYLE}>{name}</span>
              </Tooltip>
              {isCurrentDevice(row) && (
                <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                  当前设备
                </Tag>
              )}
            </div>
            <div style={SECONDARY_STYLE}>{row.phone || EMPTY}</div>
          </div>
        );
      },
    },
    {
      title: '设备名称',
      dataIndex: 'device_name',
      width: 170,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v} mouseEnterDelay={0.3}>
            <div style={PRIMARY_STYLE}>{v}</div>
          </Tooltip>
        ) : (
          <span style={{ color: 'var(--text-3)' }}>{EMPTY}</span>
        ),
    },
    {
      title: '类型',
      dataIndex: 'device_type',
      width: 90,
      render: (v: DeviceType) => <DeviceTypeTag type={v} />,
    },
    {
      title: '设备指纹',
      dataIndex: 'device_fingerprint',
      width: 180,
      // 36 位指纹整段渲染会折行：单行省略 + 悬停全文 + 点击复制
      render: (v: string | null) => <IdText value={v} />,
    },
    {
      title: '连接数',
      dataIndex: 'socket_count',
      width: 90,
      align: 'right',
      render: (v: number | undefined) => {
        const count = v ?? 0;
        return (
          <Tooltip
            title="同设备并存的活跃长连接数，大于 1 代表多开或重连未回收"
            mouseEnterDelay={0.3}
          >
            <span
              style={{
                color: count > 0 ? 'var(--text)' : 'var(--text-3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count.toLocaleString()}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '在线状态',
      dataIndex: 'is_online',
      width: 110,
      render: (v: boolean) =>
        v ? (
          <Badge status="success" text="在线" />
        ) : (
          <Badge status="default" text="离线" />
        ),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      width: 180,
      // 主行绝对时间单行；相对时间与上/下线时间全部收进 Tooltip，杜绝第 3 行
      render: (v: string | null, row) => {
        const stateTime = row.is_online ? row.online_at : row.offline_at;
        const stateLabel = row.is_online ? '上线' : '下线';
        const tip = (
          <div style={{ lineHeight: 1.6 }}>
            <div>相对时间：{formatRelativeTime(v)}</div>
            <div>
              {stateLabel}时间：
              {stateTime
                ? `${formatAbsoluteTime(stateTime)}（${formatRelativeTime(
                    stateTime,
                  )}）`
                : EMPTY}
            </div>
          </div>
        );
        return (
          <Tooltip title={tip} mouseEnterDelay={0.3}>
            <span
              style={{
                whiteSpace: 'nowrap',
                color: v ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {formatAbsoluteTime(v)}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => {
        const button = (
          <Button
            size="small"
            danger
            disabled={isCurrentDevice(row)}
            onClick={() => setOfflineTarget(row)}
          >
            强制下线
          </Button>
        );
        // disabled 按钮不触发鼠标事件，外层 span 承接 Tooltip
        return (
          <Tooltip
            title={
              isCurrentDevice(row)
                ? '当前设备不能强制下线（下线自己会让当前会话立即失效）'
                : ''
            }
            mouseEnterDelay={0.2}
          >
            <span
              style={{
                display: 'inline-block',
                cursor: isCurrentDevice(row) ? 'not-allowed' : 'default',
              }}
            >
              {button}
            </span>
          </Tooltip>
        );
      },
    },
  ];

  /** 180+170+90+180+90+110+180+120 */
  const TABLE_WIDTH = 1120;

  return (
    <>
      <Card title="在线概览" style={{ marginBottom: 16 }}>
        <PresenceOverviewCards
          overview={overview}
          loading={overviewLoading}
        />
      </Card>

      <Card title="在线设备">
        <PresenceFilters
          value={filters}
          onChange={onFiltersChange}
          onRefresh={refreshAll}
          loading={listLoading || overviewLoading}
        />

        <Table<PresenceDevice>
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={visibleDevices}
          loading={listLoading}
          scroll={{ x: TABLE_WIDTH }}
          locale={{ emptyText }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 台设备`,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <ForceOfflineModal
        device={offlineTarget}
        onCancel={() => setOfflineTarget(null)}
        onSuccess={refreshAll}
      />
    </>
  );
};

export default PresenceMonitor;
