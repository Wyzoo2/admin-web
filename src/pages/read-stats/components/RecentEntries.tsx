import { useEffect, useState } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';
import { adminMessageApi } from '../../../api/admin';
import type { AdminMessage } from '../../../types/admin';

/** 快捷入口最多展示的条数：会话与消息各自 3 条 */
export const RECENT_LIMIT = 3;
/** 取最近一页消息用于提取「最近会话」；覆盖 3 个不同会话足够 */
const FETCH_PAGE_SIZE = 50;

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  video: '视频',
  file: '文件',
};

export interface RecentItem {
  /** 点选后填入输入框的 id */
  key: string;
  /** 展示文案 */
  label: string;
  /** 次要说明（会话条数等），无则不展示 */
  hint?: string;
}

interface RecentData {
  conversations: RecentItem[];
  messages: RecentItem[];
}

const EMPTY: RecentData = { conversations: [], messages: [] };

/**
 * 最近会话 / 最近消息（各 3 条）。
 *
 * 数据来自一次 `GET /admin/messages?page=1&pageSize=50`：服务端已按时间倒序，
 * 前端只做「按会话去重 + 取前 3」，不参与任何筛选条件的拼装。
 * 请求失败时静默隐藏整个区块，不影响手输 ID 查询。
 */
export function useRecentMessages(): RecentData {
  const [data, setData] = useState<RecentData>(EMPTY);

  useEffect(() => {
    let alive = true;
    adminMessageApi
      .list({ page: 1, pageSize: FETCH_PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        const list: AdminMessage[] = res?.data ?? [];

        const counts = new Map<string, number>();
        for (const m of list) {
          if (!m.conversation_id) continue;
          counts.set(m.conversation_id, (counts.get(m.conversation_id) ?? 0) + 1);
        }

        const seen = new Set<string>();
        const conversations: RecentItem[] = [];
        for (const m of list) {
          if (!m.conversation_id || seen.has(m.conversation_id)) continue;
          seen.add(m.conversation_id);
          conversations.push({
            key: m.conversation_id,
            label: m.conversation_name ?? '私聊',
            hint: `${counts.get(m.conversation_id) ?? 1} 条`,
          });
          if (conversations.length >= RECENT_LIMIT) break;
        }

        const messages: RecentItem[] = list.slice(0, RECENT_LIMIT).map((m) => ({
          key: m.id,
          label: `${MESSAGE_TYPE_LABEL[m.type] ?? m.type} · ${dayjs(m.created_at).format('MM-DD HH:mm')}`,
        }));

        setData({ conversations, messages });
      })
      .catch(() => {
        if (alive) setData(EMPTY);
      });
    return () => {
      alive = false;
    };
  }, []);

  return data;
}

interface RecentTagGroupProps {
  title: string;
  items: RecentItem[];
  /** 当前已查询的 id，用于高亮 */
  activeKey?: string;
  onPick: (key: string) => void;
}

/** 最近条目标签组：点击即回填并查询；无数据时整块不渲染 */
export function RecentTagGroup({ title, items, activeKey, onPick }: RecentTagGroupProps) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{title}</span>
      {items.map((item) => {
        const active = activeKey === item.key;
        return (
          <Tag
            key={item.key}
            onClick={() => onPick(item.key)}
            style={{
              cursor: 'pointer',
              marginInlineEnd: 0,
              fontSize: 12,
              // 用主题变量显式配色：CheckableTag 的选中态依赖 colorPrimary，
              // 而深色主题的 colorPrimary 是白色，会出现白底白字
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? 'var(--accent-text)' : 'var(--text-2)',
              borderColor: active ? 'var(--accent)' : 'var(--border)',
            }}
          >
            {item.label}
            {item.hint && (
              <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>
                {item.hint}
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
