import { useState } from 'react';
import { RecentTagGroup } from './RecentEntries';
import type { RecentItem } from './RecentEntries';
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
import type { ConversationReadStats, ReadStatsMember } from '../../../types/admin';
import {
  conversationTypeLabel,
  Dash,
  formatTime,
  QueryEmptyHint,
  QueryErrorAlert,
  ratioToPercent,
  readRateStroke,
} from './statsShared';

const EMPTY_HINT = '输入会话 ID 查询该会话的消息总数与成员维度阅读进度';
const INPUT_HINT = '可粘贴会话 ID / 消息 ID，或点下方最近条目';

interface ConversationStatsPanelProps {
  /** 最近会话（最多 3 条），由页面统一取一次 */
  recent?: RecentItem[];
}

const ConversationStatsPanel = ({ recent = [] }: ConversationStatsPanelProps) => {
  const { message } = App.useApp();

  const [keyword, setKeyword] = useState('');
  const [queriedId, setQueriedId] = useState<string | null>(null);
  const [data, setData] = useState<ConversationReadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await readStatsApi.conversation(id);
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

  /** 回车与点查询共用同一条路径：先回填输入框，再立即查询 */
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

  const memberColumns: ColumnsType<ReadStatsMember> = [
    {
      title: '成员',
      dataIndex: 'display_name',
      width: 160,
      render: (v: string) => v || <Dash />,
    },
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      width: 160,
      render: (v: string) => <IdText value={v} />,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (v: string | null | undefined) =>
        v ? <span className="cell-mono">{v}</span> : <Dash />,
    },
    {
      title: '已读条数',
      dataIndex: 'read_count',
      width: 100,
      align: 'right',
      render: (v: number) => <span className="cell-mono">{v}</span>,
    },
    {
      title: '未读条数',
      dataIndex: 'unread_count',
      width: 120,
      render: (v: number) =>
        v > 0 ? (
          <Tag color="orange">{v} 条未读</Tag>
        ) : (
          <Tag color="green">已读齐</Tag>
        ),
    },
    {
      title: '已读率',
      dataIndex: 'read_rate',
      width: 160,
      render: (v: number) => {
        const percent = ratioToPercent(v);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              strokeColor={readRateStroke(percent)}
              trailColor="var(--surface-hover)"
              style={{ margin: 0, flex: 1, minWidth: 0 }}
            />
            <span
              className="cell-mono"
              style={{ width: 34, textAlign: 'right', fontSize: 11 }}
            >
              {percent}%
            </span>
          </div>
        );
      },
    },
    {
      title: '最后已读消息',
      dataIndex: 'last_read_message_id',
      width: 160,
      render: (v: string | null) => <IdText value={v} />,
    },
    {
      title: '加入时间',
      dataIndex: 'joined_at',
      width: 180,
      render: (v: string | null | undefined) => (v ? formatTime(v) : <Dash />),
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
    if (!data) return <QueryEmptyHint description="该会话暂无已读统计数据" />;

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="消息总数" value={data.message_total} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic title="成员数" value={data.members?.length ?? 0} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ height: '100%' }}>
              <Statistic
                title="会话类型"
                value={conversationTypeLabel(data.conversation_type)}
              />
            </Card>
          </Col>
        </Row>

        <Card
          size="small"
          title="成员阅读进度"
          extra={
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              会话 <IdText value={queriedId} />
            </span>
          }
        >
          <Table<ReadStatsMember>
            rowKey="user_id"
            size="small"
            columns={memberColumns}
            dataSource={data.members || []}
            loading={loading}
            pagination={false}
            scroll={{ x: 1180 }}
            locale={{ emptyText: '该会话暂无成员数据' }}
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
            placeholder="输入会话 ID"
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
        title="最近会话"
        items={recent}
        activeKey={queriedId ?? undefined}
        onPick={(id) => runQuery(id)}
      />

      {renderContent()}
    </Space>
  );
};

export default ConversationStatsPanel;
