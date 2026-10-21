import dayjs from 'dayjs';

/** 空值占位：在线监控页所有单元格统一用它，避免出现空白格 */
export const EMPTY = '—';

export function formatAbsoluteTime(input?: string | null): string {
  if (!input) return EMPTY;
  const t = dayjs(input);
  return t.isValid() ? t.format('YYYY-MM-DD HH:mm:ss') : EMPTY;
}

/** 相对时间：不引入 dayjs relativeTime 插件，按毫秒差自行换算 */
export function formatRelativeTime(input?: string | null): string {
  if (!input) return EMPTY;
  const t = dayjs(input);
  if (!t.isValid()) return EMPTY;
  const diffMinutes = Math.floor((dayjs().valueOf() - t.valueOf()) / 60000);
  if (diffMinutes < 0) return '刚刚';
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}
