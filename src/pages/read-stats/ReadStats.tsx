import { Alert, Card, Tabs, Typography } from 'antd';
import ConversationStatsPanel from './components/ConversationStatsPanel';
import MessageStatsPanel from './components/MessageStatsPanel';
import { useRecentMessages } from './components/RecentEntries';

const { Text } = Typography;

/**
 * 已读统计页。
 * 后端契约（ENGINEERING_ADMIN.md §3.3）尚未实现，接口 404 时按失败提示处理，不做任何 mock。
 * 两个维度各自持有输入 / loading / data / error，互不影响。
 */
const ReadStats = () => {
  // 快捷入口只取一次，两个 Tab 共享
  const { conversations, messages } = useRecentMessages();

  return (
  <Card title="已读统计">
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message="已读 ≠ 点开"
      description={
        <span>
          <Text code>is_read</Text> 表示消息进入该成员的已读水位；
          <Text code>revealed_at</Text> 表示焚毁消息被点开查看的时刻；
          <Text code>burn_at</Text> 为该成员的焚毁到期时刻。
          三者互不等价，已读不代表已点开。
          <br />
          逐条消息已读率由后端 <Text code>/admin/read-stats/conversations/:id</Text>{' '}
          尚未提供，故以成员维度已读率呈现。
        </span>
      }
    />
    <Tabs
      defaultActiveKey="conversation"
      items={[
        {
          key: 'conversation',
          label: '会话维度',
          children: <ConversationStatsPanel recent={conversations} />,
        },
        {
          key: 'message',
          label: '消息维度',
          children: <MessageStatsPanel recent={messages} />,
        },
      ]}
    />
  </Card>
  );
};

export default ReadStats;
