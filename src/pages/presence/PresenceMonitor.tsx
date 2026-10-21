import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Badge, Button, Card, Segmented, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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
import UserPresenceTable from './components/UserPresenceTable';
import {
  EMPTY,
  formatAbsoluteTime,
  formatRelativeTime,
} from './components/presenceFormat';
import { useAuthStore } from '../../store/auth';

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

/** 视图模式：「按设备」保持原有行为，「按用户」消费 /presence/online 的服务端聚合结果 */
type PresenceViewMode = 'device' | 'user';

const DEFAULT_FILTERS: PresenceFilterState = {
  onlineOnly: true,
  deviceType: '',
  keyword: '',
};

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
  /** 筛选栏编辑中的草稿值 */
  const [filters, setFilters] = useState<PresenceFilterState>(DEFAULT_FILTERS);
  /**
   * 已下发到请求的服务端条件：设备维度筛选改动即生效，
   * 关键字只在「刷新/查询」时下发，避免逐字符打后端。
   */
  const [applied, setApplied] = useState<PresenceFilterState>(DEFAULT_FILTERS);

  const [offlineTarget, setOfflineTarget] = useState<PresenceDevice | null>(
    null,
  );

  /** 默认「按设备」：保持原有列表行为不变 */
  const [viewMode, setViewMode] = useState<PresenceViewMode>('device');
  /** 按用户视图的重载信号：刷新按钮、强制下线成功后自增 */
  const [userReloadToken, setUserReloadToken] = useState(0);

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
      const params: PresenceDeviceQuery = {
        online_only: applied.onlineOnly,
        page,
        pageSize,
      };
      if (applied.deviceType) params.device_type = applied.deviceType;
      // 关键字由后端按手机号/昵称过滤（v2.6.0），trim 后非空才传
      const keyword = applied.keyword.trim();
      if (keyword) params.keyword = keyword;
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
  }, [applied, page, pageSize, message]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    // 用户视图的数据来自 /presence/online，不必再拉设备列表；
    // 切回设备视图时再按当前 applied 条件查一次
    if (viewMode === 'device') void fetchDevices();
  }, [fetchDevices, viewMode]);

  const refreshAll = useCallback(() => {
    // 刷新即「查询」：把草稿里的关键字下发到请求参数（applied 换新引用会重新触发 fetchDevices）
    setApplied({ ...filters });
    void fetchOverview();
    setUserReloadToken((t) => t + 1);
  }, [filters, fetchOverview]);

  const onFiltersChange = useCallback(
    (next: PresenceFilterState) => {
      setFilters(next);
      // 设备维度筛选变化时回到第一页并立即下发；关键字仍由「刷新」提交
      if (
        next.onlineOnly !== filters.onlineOnly ||
        next.deviceType !== filters.deviceType
      ) {
        setPage(1);
        setApplied({ ...next, keyword: applied.keyword });
      }
    },
    [filters.onlineOnly, filters.deviceType, applied.keyword],
  );

  // 只拦「当前设备」：登录时记下的设备指纹 vs 行上的 device_fingerprint
  const currentDeviceId = useAuthStore((s) => s.deviceId);
  const isCurrentDevice = useCallback(
    (row: PresenceDevice) =>
      !!currentDeviceId && row.device_fingerprint === currentDeviceId,
    [currentDeviceId],
  );

  const emptyText = useMemo(() => {
    const kw = applied.keyword.trim();
    if (kw && devices.length === 0) return `没有匹配「${kw}」的设备`;
    if (applied.onlineOnly) return '当前无在线设备';
    return '暂无设备数据';
  }, [applied.keyword, applied.onlineOnly, devices.length]);

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
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as PresenceViewMode)}
          options={[
            { label: '按设备', value: 'device' },
            { label: '按用户', value: 'user' },
          ]}
          style={{ marginBottom: 16 }}
        />

        <PresenceFilters
          value={filters}
          onChange={onFiltersChange}
          onRefresh={refreshAll}
          loading={listLoading || overviewLoading}
          mode={viewMode}
        />

        {viewMode === 'user' && (
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-3)' }}>
            按用户视图来自 <span className="cell-mono">/presence/online</span>
            （服务端聚合，仅在线用户）。
          </div>
        )}

        {viewMode === 'device' ? (
          <Table<PresenceDevice>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={devices}
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
        ) : (
          <UserPresenceTable
            keyword={applied.keyword}
            reloadToken={userReloadToken}
            onForceOfflineDone={refreshAll}
          />
        )}
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
