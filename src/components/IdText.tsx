import { App, Tooltip } from 'antd';

interface IdTextProps {
  value?: string | null;
  /** 省略后保留的首部字符数 */
  head?: number;
  /** 省略后保留的尾部字符数 */
  tail?: number;
}

/**
 * 单行展示长 ID（UUID 等）：中间省略 + 悬停看全文 + 点击复制。
 *
 * 为什么不用整段等宽文本：UUID 在 15-20 字符宽的列里会折成 2~3 行，
 * 把所有行高一起撑高，表格看起来参差不齐。
 */
export default function IdText({ value, head = 8, tail = 6 }: IdTextProps) {
  const { message } = App.useApp();

  if (!value) return <span style={{ color: 'var(--text-3)' }}>—</span>;

  const short =
    value.length > head + tail + 1
      ? `${value.slice(0, head)}…${value.slice(-tail)}`
      : value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('已复制 ID');
    } catch {
      message.error('复制失败，请手动选择');
    }
  };

  return (
    <Tooltip title={`${value}（点击复制）`}>
      <span
        className="cell-mono"
        onClick={copy}
        style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
      >
        {short}
      </span>
    </Tooltip>
  );
}
