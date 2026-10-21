import { App, Tooltip } from 'antd';

interface IdTextProps {
  value?: string | null;
  /** 省略后保留的首部字符数 */
  head?: number;
  /** 省略后保留的尾部字符数 */
  tail?: number;
}

/**
 * 用 document.execCommand('copy') 复制。
 *
 * 为什么需要：`navigator.clipboard` 只在安全上下文（HTTPS / localhost）暴露，
 * 通过 `http://<内网IP>` 访问后台时它是 undefined；而 execCommand 在 HTTP 下仍可用，
 * 是目前唯一能覆盖「内网 IP + HTTP」环境的方案。
 */
function copyWithExecCommand(text: string): boolean {
  const prevActive = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const prevRanges: Range[] = [];
  if (selection) {
    for (let i = 0; i < selection.rangeCount; i += 1) {
      prevRanges.push(selection.getRangeAt(i));
    }
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('aria-hidden', 'true');
  // 必须留在文档里且可选中，否则部分浏览器 execCommand 返回 false
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.width = '1px';
  ta.style.height = '1px';
  ta.style.padding = '0';
  ta.style.border = 'none';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  document.body.appendChild(ta);

  let ok = false;
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    ta.remove();
    // 还原用户原来的焦点与选区，避免复制动作干扰页面
    if (selection) {
      selection.removeAllRanges();
      prevRanges.forEach((range) => selection.addRange(range));
    }
    prevActive?.focus?.();
  }
  return ok;
}

/**
 * 单行展示长 ID（UUID 等）：中间省略 + 悬停看全文 + 点击复制。
 *
 * 复制按环境降级：Clipboard API（HTTPS / localhost）→ execCommand（HTTP + 内网 IP）。
 * 两者都失败时只提示「复制失败」，不弹手动选择框。
 */
export default function IdText({ value, head = 8, tail = 6 }: IdTextProps) {
  const { message } = App.useApp();

  if (!value) return <span style={{ color: 'var(--text-3)' }}>—</span>;

  const short =
    value.length > head + tail + 1
      ? `${value.slice(0, head)}…${value.slice(-tail)}`
      : value;

  const copy = async () => {
    // 1) Clipboard API：只要浏览器暴露了就试（个别环境在 HTTP 下也提供）
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        message.success('已复制 ID');
        return;
      } catch {
        // 权限被拒 / 无用户手势 / 文档未聚焦，继续走 execCommand
      }
    }
    // 2) execCommand：HTTP + 内网 IP 场景的实际生效路径
    if (copyWithExecCommand(value)) {
      message.success('已复制 ID');
      return;
    }
    message.error('复制失败');
  };

  return (
    <Tooltip title={`${value}（点击复制）`}>
      <span
        className="cell-mono"
        onClick={copy}
        style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'text' }}
      >
        {short}
      </span>
    </Tooltip>
  );
}
