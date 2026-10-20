import { useState } from 'react';
import { Card, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import DestroyRecordTable from './components/DestroyRecordTable';
import PendingPurgeTable from './components/PendingPurgeTable';

type TabKey = 'destroyed' | 'pending_purge';

/**
 * 焚毁记录页：销毁流水 / 待真删队列两个视图。
 * 每个视图各自持有筛选与分页状态；首次进入某视图才挂载，实现懒加载。
 */
const DestroyRecordList: React.FC = () => {
  const [activeKey, setActiveKey] = useState<TabKey>('destroyed');
  const [visited, setVisited] = useState<Record<TabKey, boolean>>({
    destroyed: true,
    pending_purge: false,
  });

  const onTabChange = (key: string) => {
    const next: TabKey = key === 'pending_purge' ? 'pending_purge' : 'destroyed';
    setActiveKey(next);
    setVisited((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
  };

  const items: TabsProps['items'] = [
    {
      key: 'destroyed',
      label: '销毁流水',
      children: visited.destroyed ? <DestroyRecordTable /> : null,
    },
    {
      key: 'pending_purge',
      label: '待真删队列',
      children: visited.pending_purge ? <PendingPurgeTable /> : null,
    },
  ];

  return (
    <Card title="焚毁记录">
      <Tabs activeKey={activeKey} onChange={onTabChange} items={items} />
    </Card>
  );
};

export default DestroyRecordList;
