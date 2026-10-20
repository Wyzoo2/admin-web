import { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { readStatsApi } from '../../../api/admin';
import IdText from '../../../components/IdText';
import type { MessageReadStats, MessageReader } from '../../../types/admin';
import { RecentTagGroup } from './RecentEntries';
import type { RecentEntry } from './RecentEntries';
import {
  Dash,
  formatTime,
  QueryEmptyHint,
  QueryErrorAlert,
  readRatePercent,
  readRateStroke,
} from './statsShared';

const EMPTY_HINT = '输入消息 ID 查询该消息的应读 / 已读 / 已点开汇总与逐人明细';
const INPUT_HINT = '可粘贴会话 ID / 消息 ID，或点上方最近条目';

const MessageStatsPanel = ({ recent }: { recent: RecentEntry[] }) => {
  const { message } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [queriedId, setQueriedId] = useState<string | null>(null);
  const [data, setData] = useState<MessageReadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await readStatsApi.message(id);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请求失败';
      setError(msg);
      setData(null);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 回车、点查询、点快捷标签共用同一条路径：先回填输入框，再立即查询 */
  const runQuery = (raw: string) => {
    const id = raw.trim();
    setKeyword(id);
    if (!id) {
      setQueriedId(null);
      setData(null);
      setError(null);
      return;
    }
    setQueriedId(id);
    void load(id);
  };

  const readerColumns: ColumnsType<MessageReader> = [
    {
      title: '成员',
      dataIndex: 'display_name',
      width: 200,
      render: (v: string, r) => (
        <Space size={4}>
          <span>{v || <Dash />}</span>
          {r.is_sender ? <Tag color="blue">发送方</Tag> : null}
        </Space>
      ),
    },
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <IdText value={v} />,
    },
    {
      title: '已读状态',
      dataIndex: 'is_read',
      width: 110,
      render: (v: boolean) =>
        v ? <Tag color="green">已读</Tag> : <Tag color="default">未读</Tag>,
    },
    {
      title: '已读时间',
      dataIndex: 'read_at',
      width: 180,
      render: (v: string | null) => (v ? formatTime(v) : <Dash />),
    },
    {
      title: '点开时间',
      dataIndex: 'revealed_at',
      width: 180,
      render: (v: string | null) =>
        v ? (
          formatTime(v)
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>未点开</span>
        ),
    },
    {
      title: '焚毁到期',
      dataIndex: 'burn_at',
      width: 180,
      render: (v: string | null) => (v ? formatTime(v) : <Dash />),
    },
  ];

  const renderContent = () => {
    if (error) {
      return (
        <QueryErrorAlert
          error={error}
          onRetry={() => {
            if (queriedId) void load(queriedId);
          }}
        />
      );
    }
    if (!queriedId) return <QueryEmptyHint description={EMPTY_HINT} />;
    if (loading && !data) {
      return (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      );
    }
    if (!data) return <QueryEmptyHint description="该消息暂无已读统计数据" />;

    const percent = readRatePercent(data.read, data.total);

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="应读人数" value={data.total} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="已读" value={data.read} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="已点开" value={data.revealed} />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="已读率">
          <Progress
            percent={percent}
            size="small"
            strokeColor={readRateStroke(percent)}
            trailColor="var(--surface-hover)"
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            已读 {data.read} / 应读 {data.total}；查询消息 ID：
            <IdText value={queriedId} />
          </span>
        </Card>

        <Card size="small" title="读者明细">
          <Table<MessageReader>
            rowKey="user_id"
            size="small"
            columns={readerColumns}
            dataSource={data.readers || []}
            loading={loading}
            pagination={false}
            scroll={{ x: 1010 }}
            locale={{ emptyText: '该消息暂无读者数据' }}
          />
        </Card>
      </Space>
    );
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space.Compact>
          <Input
            allowClear
            value={keyword}
            placeholder="输入消息 ID"
            style={{ width: 420, maxWidth: '100%' }}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => runQuery(keyword)}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={() => runQuery(keyword)}
          >
            查询
          </Button>
        </Space.Compact>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{INPUT_HINT}</span>
      </div>

      <RecentTagGroup
        title="最近消息"
        entries={recent}
        activeKey={queriedId}
        onPick={runQuery}
      />

      {renderContent()}
    </Space>
  );
};

export default MessageStatsPanel;
