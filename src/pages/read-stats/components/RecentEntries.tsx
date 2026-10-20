import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Space, Tag } from 'antd';
import { adminMessageApi } from '../../../api/admin';
import type { AdminMessage } from '../../../types/admin';
import { formatShortTime, messageTypeLabel } from './statsShared';
import './recentEntries.css';

/**
 * 快捷入口的数据源：一次取最近的 50 条消息。
 * 后端 /admin/* 的 pageSize 上限是 100，这里取 50 已足够覆盖 8 个会话 + 8 条消息，
 * 也避免首屏为一个辅助区块拉满 100 条。
 */
const RECENT_PAGE_SIZE = 50;
/** 会话与消息各展示 8 个 */
const RECENT_LIMIT = 8;

/**
 * 挂载时取一次最近消息。
 * 失败返回 null 而不是抛错：快捷入口只是辅助，接口 404 时整块隐藏，
 * 输入框照常可用，不打断主流程也不弹错误。
 */
export const useRecentMessages = (): AdminMessage[] | null => {
  const [items, setItems] = useState<AdminMessage[] | null>(null);

  useEffect(() => {
    let alive = true;
    adminMessageApi
      .list({ page: 1, pageSize: RECENT_PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setItems(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (alive) setItems(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return items;
};

/** 一个快捷标签：key 用于查重与选中态，content 为标签内容 */
export interface RecentEntry {
  key: string;
  content: ReactNode;
}

/**
 * 会话维度快捷入口：按 conversation_id 去重，保留最近 8 个。
 * 私聊没有会话名（后端给 null），回退为「私聊」；计数是这批最近消息里的条数，
 * 不是会话总消息数，因此用淡色小字标注，避免被误读成统计值。
 */
export const toRecentConversations = (
  items: AdminMessage[] | null,
): RecentEntry[] => {
  if (!items || items.length === 0) return [];

  const seen = new Map<string, { name: string; count: number }>();
  items.forEach((m) => {
    const hit = seen.get(m.conversation_id);
    if (hit) {
      hit.count += 1;
      return;
    }
    seen.set(m.conversation_id, {
      name: m.conversation_name || '私聊',
      count: 1,
    });
  });

  return Array.from(seen.entries())
    .slice(0, RECENT_LIMIT)
    .map(([id, meta]) => ({
      key: id,
      content: (
        <>
          {meta.name}
          <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.65 }}>
            {meta.count} 条
          </span>
        </>
      ),
    }));
};

/** 消息维度快捷入口：最近 8 条，文案 = 类型中文 · MM-DD HH:mm */
export const toRecentMessages = (
  items: AdminMessage[] | null,
): RecentEntry[] =>
  (items ?? []).slice(0, RECENT_LIMIT).map((m) => ({
    key: m.id,
    content: `${messageTypeLabel(m.type)} · ${formatShortTime(m.created_at)}`,
  }));

/**
 * 快捷标签组：无数据时整块不渲染（连标题一起），避免出现空标题加空白。
 * 用 checkable Tag 而非自定义按钮——外观与列表页的标签一致，
 * 且 hover / 选中态由 AntD 主题接管，暗色主题不用额外配色。
 */
export const RecentTagGroup = ({
  title,
  entries,
  activeKey,
  onPick,
}: {
  title: string;
  entries: RecentEntry[];
  activeKey: string | null;
  onPick: (key: string) => void;
}) => {
  if (entries.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
        {title}
      </div>
      <Space size={[8, 8]} wrap>
        {entries.map((entry) => (
          <Tag.CheckableTag
            key={entry.key}
            className="recent-tag"
            checked={activeKey === entry.key}
            onChange={() => onPick(entry.key)}
          >
            {entry.content}
          </Tag.CheckableTag>
        ))}
      </Space>
    </div>
  );
};
