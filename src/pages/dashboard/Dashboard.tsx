import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, Progress, Row, Tooltip } from 'antd';
import {
  ApartmentOutlined,
  CommentOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { statsApi } from '../../api/stats';
import type { StatsOverview } from '../../types';

function formatBytes(bytes?: number): string {
  if (bytes == null || Number.isNaN(bytes)) return '-';
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const storage = data?.storage;
  const storagePct =
    storage?.total_bytes && storage.total_bytes > 0
      ? Math.min(100, Math.round((storage.db_bytes / storage.total_bytes) * 100))
      : 0;

  return (
    <Card
      title="仪表盘"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={fetchData}
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
            value={data?.total_users ?? '-'}
            accent="#2563eb"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="已停用"
            value={data?.disabled_users ?? '-'}
            accent="#9b9a97"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="已注销"
            value={data?.deleted_users ?? '-'}
            accent="#b42318"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="今日活跃"
            value={data?.today_active_users ?? '-'}
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
            value={(data?.total_messages ?? 0).toLocaleString()}
            accent="#7c3aed"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="今日消息"
            value={(data?.today_messages ?? 0).toLocaleString()}
            accent="#0891b2"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="有效群组"
            value={data?.total_groups ?? '-'}
            accent="#ea580c"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="有效会话"
            value={data?.total_conversations ?? '-'}
            accent="#db2777"
            loading={loading && data == null}
          />
        </Col>
      </Row>

      {/* 设备与存储 */}
      <SectionTitle>
        <DesktopOutlined /> 设备与存储
      </SectionTitle>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <MetricCard
            label="在线设备"
            value={data?.online_devices ?? '-'}
            accent="#2563eb"
            loading={loading && data == null}
          />
        </Col>
        <Col xs={24} sm={12} md={16} lg={18}>
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
