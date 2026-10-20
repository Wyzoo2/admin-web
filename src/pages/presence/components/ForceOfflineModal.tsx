import { useEffect, useState } from 'react';
import { App, Input, Modal } from 'antd';
import { presenceApi } from '../../../api/admin';
import type { PresenceDevice } from '../../../types/admin';
import IdText from '../../../components/IdText';

const EMPTY = '—';

interface ForceOfflineModalProps {
  /** null 表示关闭 */
  device: PresenceDevice | null;
  onCancel: () => void;
  /** 成功后由父组件刷新列表与概览 */
  onSuccess: () => void;
}

/**
 * 强制下线二次确认。
 * 用受控 Modal 而非 Modal.confirm，因为需要「手输设备记录 id」的自校验状态驱动按钮禁用。
 * 接口路径参数是设备记录 id，device_fingerprint 仅用于人工核对。
 */
const ForceOfflineModal: React.FC<ForceOfflineModalProps> = ({
  device,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (device) setTyped('');
  }, [device]);

  const matched = device != null && typed.trim() === device.id;
  const arrow = '\u2192';

  const handleOk = async () => {
    if (!device || !matched || submitting) return;
    setSubmitting(true);
    try {
      const res = await presenceApi.forceOffline(device.id);
      message.success(
        `设备 ${res?.device_id ?? device.id} 已强制下线`,
      );
      onSuccess();
      onCancel();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '强制下线失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={device != null}
      title="强制下线设备"
      okText="确认下线"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{ danger: true, disabled: !matched }}
      onOk={handleOk}
      onCancel={onCancel}
    >
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: 'var(--text-2)',
          marginBottom: 14,
        }}
      >
        被踢设备下次请求将
        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
          立即返回 401
        </span>
        ，需要重新登录。该动作不可撤销，并会写入审计日志（
        <span className="cell-mono">admin_force_offline_device</span>）。
      </div>

      <div
        style={{
          padding: '10px 12px',
          marginBottom: 14,
          background: 'var(--surface-hover)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.9,
        }}
      >
        <div>
          用户：
          {device?.display_name ?? device?.user_id ?? EMPTY}
          {device?.phone ? `（${device.phone}）` : ''}
        </div>
        <div>设备名称：{device?.device_name || EMPTY}</div>
        <div>
          设备记录 ID：<IdText value={device?.id} />
        </div>
        <div>
          设备指纹（仅核对用）：<IdText value={device?.device_fingerprint} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
        为避免误操作，请输入上方「设备记录 ID（不是设备指纹）」
        {arrow} 一致后才能提交：
      </div>
      <Input
        value={typed}
        placeholder="输入设备记录 ID"
        className="cell-mono"
        allowClear
        onChange={(e) => setTyped(e.target.value)}
        onPressEnter={() => {
          void handleOk();
        }}
      />
      {typed.length > 0 && !matched && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
          设备记录 ID 不匹配，无法提交
        </div>
      )}
    </Modal>
  );
};

export default ForceOfflineModal;
