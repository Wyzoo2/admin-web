import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Empty, Progress, Row, Tooltip } from 'antd';
import {
  CommentOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FireOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { destroyRecordApi } from '../../api/admin';
import { statsApi } from '../../api/stats';
import type { DestroyRecord } from '../../types/admin';
import type { StatsOverview } from '../../types';

/** 缺失值统一占位符 */
const NA = '—';

/** 焚毁原因分布单次统计上限：数据量更大时只覆盖当日前 N 条流水 */
const FLOW_PAGE_SIZE = 100;

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 数字千分位；无值渲染 — */
function formatNumber(v?: number | null): React.ReactNode {
  return isNum(v) ? v.toLocaleString('zh-CN') : NA;
}

/** 平均存活时长：< 60 秒显示「N 秒」，否则「3 天 2 小时 15 分」 */
function formatDuration(seconds?: number | null): string {
  if (!isNum(seconds) || seconds < 0) return NA;
  const total = Math.round(seconds);
  if (total < 60) return `${total} 秒`;
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (days > 0 || hours > 0) parts.push(`${hours} 小时`);
  parts.push(`${minutes} 分`);
  return parts.join(' ');
}

/** 焚毁原因 key → 中文标签（未知 key 原样展示） */
const DESTROY_REASON_LABELS: Record<string, string> = {
  all_read: '阅读完成',
  fallback_expired: '兜底到期',
  admin_manual: '管理员手动',
  manual: '管理员手动',
  owner_dissolve: '群主解散',
  admin_dissolve: '管理员解散',
};

const destroyReasonLabel = (key: string): string =>
  DESTROY_REASON_LABELS[key] ?? key;

function formatBytes(bytes?: number): string {
  if (!isNum(bytes)) return NA;
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 单张指标卡片 */
interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** 左侧彩色条 */
  accent: string;
  hint?: React.ReactNode;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  accent,
  hint,
  loading,
}) => (
  <div
    className="metric-card"
    style={{
      position: 'relative',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '16px 18px 14px 20px',
      overflow: 'hidden',
      transition: 'transform .15s ease, box-shadow .15s ease',
      cursor: 'default',
      minHeight: 96,
    }}
  >
    {/* 左侧彩色条 */}
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
        color: 'var(--text)',
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

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-2)',
      letterSpacing: '.4px',
      textTransform: 'uppercase',
      margin: '4px 2px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}
  >
    {children}
  </div>
);

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(false);

  /** 今日销毁流水：焚毁原因分布与平均存活时长都由这一批真实流水在前端聚合 */
  const [records, setRecords] = useState<DestroyRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await statsApi.overview();
      setData(res);
    } catch (e: any) {
      message.error(e.message || '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFlow = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const res = await destroyRecordApi.list({
        start_time: dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        end_time: dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
        page: 1,
        pageSize: FLOW_PAGE_SIZE,
      });
      setRecords(res?.data ?? []);
      setRecordsTotal(res?.total ?? 0);
    } catch (e) {
      // 流水请求失败只降级底部聚合卡片，主指标与页面其余部分照常展示
      setRecords([]);
      setRecordsTotal(0);
      setRecordsError(e instanceof Error ? e.message : '销毁流水请求失败');
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    void fetchFlow();
  }, [fetchData, fetchFlow]);

  const refresh = useCallback(() => {
    void fetchData();
    void fetchFlow();
  }, [fetchData, fetchFlow]);

  /** 前端聚合：按 destroy_reason 分组计数（数量倒序）+ 平均存活秒数 */
  const flowSummary = useMemo(() => {
    const counts = new Map<string, number>();
    let aliveSum = 0;
    let aliveCount = 0;
    for (const record of records) {
      const reason =
        typeof record.destroy_reason === 'string' && record.destroy_reason
          ? record.destroy_reason
          : 'unknown';
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
      if (isNum(record.alive_seconds) && record.alive_seconds >= 0) {
        aliveSum += record.alive_seconds;
        aliveCount += 1;
      }
    }
    const rows = Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    return {
      rows,
      total,
      avgAliveSeconds: aliveCount > 0 ? Math.round(aliveSum / aliveCount) : null,
    };
  }, [records]);

  const storage = data?.storage;
  const storagePct =
    isNum(storage?.total_bytes) &&
    isNum(storage?.db_bytes) &&
    storage.total_bytes > 0
      ? Math.min(100, Math.round((storage.db_bytes / storage.total_bytes) * 100))
      : 0;

  const flowTruncated = recordsTotal > records.length;

  return (
    <Card
      title="仪表盘"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading || recordsLoading}
          onClick={refresh}
        >
          刷新
        </Button>
      }
    >
      <div style={{ marginBottom: 18, color: 'var(--text-3)', fontSize: 12 }}>
        {data?.generated_at
          ? `统计时间：${dayjs(data.generated_at).format('YYYY-MM-DD HH:mm:ss')}`
          : '加载中…'}
      </div>

      {/* 账号概览 */}
      <SectionTitle>
        <TeamOutlined /> 账号概览
      </SectionTitle>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="有效账号"
            value={formatNumber(data?.total_users)}
            accent="#2563eb"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="已停用"
            value={formatNumber(data?.disabled_users)}
            accent="#9b9a97"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="已注销"
            value={formatNumber(data?.deleted_users)}
            accent="#b42318"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="今日活跃"
            value={formatNumber(data?.today_active_users)}
            accent="#16a34a"
            loading={loading && data == null}
          />
        </Col>
      </Row>

      {/* 消息与会话 */}
      <SectionTitle>
        <CommentOutlined /> 消息与会话
      </SectionTitle>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="累计消息"
            value={formatNumber(data?.total_messages)}
            accent="#7c3aed"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="今日消息"
            value={formatNumber(data?.today_messages)}
            accent="#0891b2"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="有效群组"
            value={formatNumber(data?.total_groups)}
            accent="#ea580c"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="有效会话"
            value={formatNumber(data?.total_conversations)}
            accent="#db2777"
            loading={loading && data == null}
          />
        </Col>
      </Row>

      {/* 存储占用（在线用户/在线设备已并入下方焚毁分区，避免同一指标出现两张卡） */}
      <SectionTitle>
        <DatabaseOutlined /> 存储占用
      </SectionTitle>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 20px',
              minHeight: 96,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    marginBottom: 6,
                  }}
                >
                  存储占用
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 650,
                    color: 'var(--text)',
                    opacity: loading && !data ? 0.4 : 1,
                  }}
                >
                  {formatBytes(storage?.total_bytes)}
                </div>
              </div>
            </div>
            <Progress
              percent={storagePct}
              showInfo={false}
              strokeColor="#16a34a"
              trailColor="var(--surface-hover)"
              size="small"
            />
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--text-3)',
                display: 'flex',
                gap: 18,
                flexWrap: 'wrap',
              }}
            >
              <Tooltip title="数据库文件占用">
                <span>
                  <DatabaseOutlined /> 数据库 {formatBytes(storage?.db_bytes)}
                </span>
              </Tooltip>
              <Tooltip title="上传附件占用">
                <span>
                  <FileDoneOutlined /> 附件 {formatBytes(storage?.upload_bytes)}
                  {storage?.upload_files != null
                    ? ` · ${storage.upload_files} 个文件`
                    : ''}
                </span>
              </Tooltip>
            </div>
          </div>
        </Col>
      </Row>

      {/* 焚毁 V6.0 */}
      <div style={{ marginTop: 20 }}>
        <SectionTitle>
          <FireOutlined /> 焚毁 V6.0
        </SectionTitle>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <MetricCard
              label="在线用户"
              value={formatNumber(data?.online_users)}
              accent="var(--accent)"
              // hint="取自 /stats/overview"
              loading={loading && data == null}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <MetricCard
              label="在线设备"
              value={formatNumber(data?.online_devices)}
              accent="#2563eb"
              // hint="取自 /stats/overview"
              loading={loading && data == null}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <MetricCard
              label="今日焚毁"
              value={formatNumber(data?.today_destroyed)}
              accent="var(--danger)"
              loading={loading && data == null}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <MetricCard
              label="待真删消息"
              value={formatNumber(data?.pending_purge)}
              accent="#b42318"
              hint="已焚毁、等待真删的积压条数"
              loading={loading && data == null}
            />
          </Col>
        </Row>

        {/* 焚毁原因分布（前端聚合当日销毁流水） */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              letterSpacing: '.2px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>
              今日焚毁原因分布（基于销毁流水）
              {flowSummary.total > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--text-3)' }}>
                  样本 {flowSummary.total.toLocaleString('zh-CN')} 条
                </span>
              )}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-2)',
              }}
            >
              平均存活时长
              <span
                style={{
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {recordsLoading && records.length === 0
                  ? '加载中…'
                  : formatDuration(flowSummary.avgAliveSeconds)}
              </span>
              {flowTruncated && (
                <Tooltip title={`当日销毁流水共 ${recordsTotal} 条，最多统计当日 ${FLOW_PAGE_SIZE} 条流水`}>
                  <InfoCircleOutlined style={{ color: 'var(--text-3)' }} />
                </Tooltip>
              )}
            </span>
          </div>

          {recordsError !== null ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`销毁流水加载失败：${recordsError}（不影响上方指标）`}
            />
          ) : recordsLoading && records.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="正在加载今日销毁流水…"
            />
          ) : flowSummary.rows.length === 0 || flowSummary.total <= 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无今日焚毁数据"
            />
          ) : (
            flowSummary.rows.map(([key, count]) => {
              const pct = (count / flowSummary.total) * 100;
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <Tooltip title={key}>
                    <span
                      style={{
                        flex: '0 0 96px',
                        fontSize: 12,
                        color: 'var(--text-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {destroyReasonLabel(key)}
                    </span>
                  </Tooltip>
                  <div
                    role="progressbar"
                    aria-label={destroyReasonLabel(key)}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={flowSummary.total}
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--surface-hover)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: 'var(--danger)',
                        transition: 'width .3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      flex: '0 0 88px',
                      textAlign: 'right',
                      fontSize: 13,
                      color: 'var(--text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count.toLocaleString('zh-CN')}
                  </span>
                  <span
                    style={{
                      flex: '0 0 56px',
                      textAlign: 'right',
                      fontSize: 12,
                      color: 'var(--text-3)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow);
        }
      `}</style>
    </Card>
  );
};

export default Dashboard;
