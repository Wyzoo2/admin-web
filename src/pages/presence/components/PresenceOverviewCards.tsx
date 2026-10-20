import { Col, Row, Tag, Tooltip } from 'antd';
import type { PresenceOverview } from '../../../types/admin';
import type { DeviceType } from '../../../types';

const EMPTY = '—';

/** 字段缺失时统一的 Tooltip 说明 */
const missingFieldTip = (field: string): string =>
  `字段 ${field} 缺失：后端 /admin/presence/overview 尚未返回该字段`;

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** 左侧彩色条，只能传 CSS 变量 */
  accent: string;
  hint?: React.ReactNode;
  loading?: boolean;
  /** 有值即代表该指标缺失，卡片整体挂 Tooltip */
  missingTip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  accent,
  hint,
  loading,
  missingTip,
}) => {
  const card = (
    <div
      className="presence-metric-card"
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px 18px 14px 20px',
        overflow: 'hidden',
        transition: 'transform .15s ease, box-shadow .15s ease',
        cursor: missingTip ? 'help' : 'default',
        minHeight: 96,
        // 同一行卡片等高，避免 hint 有无造成高低不齐
        height: '100%',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accent,
        }}
      />
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          letterSpacing: '.2px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 650,
          lineHeight: 1.2,
          color: missingTip ? 'var(--text-3)' : 'var(--text)',
          opacity: loading ? 0.4 : 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
          {hint}
        </div>
      )}
    </div>
  );

  if (!missingTip) return card;
  return (
    <Tooltip title={missingTip} mouseEnterDelay={0.2}>
      {card}
    </Tooltip>
  );
};

/** 数值或缺失占位 */
const renderCount = (v: number | undefined): React.ReactNode =>
  v == null ? EMPTY : v.toLocaleString();

interface TypeMetric {
  key: DeviceType;
  label: string;
  accent: string;
}

const TYPE_METRICS: TypeMetric[] = [
  { key: 'mobile', label: '手机在线', accent: 'var(--accent)' },
  { key: 'desktop', label: '桌面在线', accent: 'var(--text-2)' },
  { key: 'tablet', label: '平板在线', accent: 'var(--text-3)' },
  { key: 'web', label: '网页在线', accent: 'var(--accent-soft)' },
];

interface PresenceOverviewCardsProps {
  overview: PresenceOverview | null;
  loading: boolean;
}

const PresenceOverviewCards: React.FC<PresenceOverviewCardsProps> = ({
  overview,
  loading,
}) => {
  /** 实测 online_by_type 是数组，不是 map；数组内缺失的类型按 0 处理 */
  const byType = overview?.online_by_type;
  const hasByType = Array.isArray(byType);
  const countOf = (type: DeviceType): number | undefined =>
    byType?.find((item) => item.device_type === type)?.count;

  const staleCount = overview?.stale_online_devices;
  const isStale = staleCount != null && staleCount > 0;
  const ttl = overview?.online_ttl_seconds;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="在线用户"
            value={renderCount(overview?.online_users)}
            accent="var(--accent)"
            hint="当前存在在线会话的账号数"
            loading={loading}
            missingTip={
              overview?.online_users == null
                ? missingFieldTip('online_users')
                : undefined
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="在线设备"
            value={renderCount(overview?.online_devices)}
            accent="var(--accent)"
            hint="在线状态未过 TTL 的终端数"
            loading={loading}
            missingTip={
              overview?.online_devices == null
                ? missingFieldTip('online_devices')
                : undefined
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="全部设备"
            value={renderCount(overview?.total_devices)}
            accent="var(--text-2)"
            hint="设备记录总数，用于和在线数对比"
            loading={loading}
            missingTip={
              overview?.total_devices == null
                ? missingFieldTip('total_devices')
                : undefined
            }
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="疑似失联设备"
            value={renderCount(staleCount)}
            accent={isStale ? 'var(--danger)' : 'var(--text-3)'}
            hint={
              isStale ? (
                <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                  {staleCount} 台超过 TTL 仍标记在线
                </Tag>
              ) : (
                '超过 TTL 仍标记在线即为异常'
              )
            }
            loading={loading}
            missingTip={
              staleCount == null
                ? missingFieldTip('stale_online_devices')
                : undefined
            }
          />
        </Col>
      </Row>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-2)',
          letterSpacing: '.4px',
          margin: '0 2px 10px',
        }}
      >
        按设备类型
      </div>
      <Row gutter={[16, 16]}>
        {TYPE_METRICS.map((m) => (
          <Col xs={24} sm={12} md={6} key={m.key}>
            <MetricCard
              label={m.label}
              value={hasByType ? renderCount(countOf(m.key) ?? 0) : EMPTY}
              accent={m.accent}
              loading={loading}
              missingTip={
                hasByType
                  ? undefined
                  : missingFieldTip(`online_by_type[${m.key}]`)
              }
            />
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
        {ttl == null ? (
          <Tooltip
            title={missingFieldTip('online_ttl_seconds')}
            mouseEnterDelay={0.2}
          >
            <span>在线判定 TTL：{EMPTY}</span>
          </Tooltip>
        ) : (
          `在线判定 TTL：${ttl} 秒（超过该时长未心跳视为离线）`
        )}
      </div>

      <style>{`
        .presence-metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
      `}</style>
    </>
  );
};

export default PresenceOverviewCards;
