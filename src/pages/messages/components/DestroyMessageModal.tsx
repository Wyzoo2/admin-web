import { useEffect, useState } from 'react';
import { Alert, App, Input, Modal } from 'antd';
import { adminMessageApi } from '../../../api/admin';

interface Props {
  open: boolean;
  /** 待焚毁的消息 ID；为 null 时表示无目标 */
  messageId: string | null;
  onCancel: () => void;
  /** 焚毁成功后回调；关闭弹框与刷新数据由调用方负责 */
  onSuccess: (id: string) => void;
}

const DestroyMessageModal: React.FC<Props> = ({
  open,
  messageId,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 每次重新打开都清空上一次的输入，避免残留内容直接满足二次确认
  useEffect(() => {
    if (open) setInput('');
  }, [open]);

  const target = (messageId ?? '').trim();
  const matched = target.length > 0 && input.trim() === target;
  const mismatched = input.trim().length > 0 && !matched;

  const onSubmit = async () => {
    if (!target || !matched) return;
    setSubmitting(true);
    try {
      await adminMessageApi.destroy(target, 'admin_manual');
      message.success('已焚毁');
      onSuccess(target);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '焚毁失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="手动焚毁消息"
      open={open}
      onOk={onSubmit}
      onCancel={onCancel}
      okText="确认焚毁"
      cancelText="取消"
      okButtonProps={{ danger: true, disabled: !matched, loading: submitting }}
      destroyOnHidden
      width={520}
    >
      <Alert
        type="warning"
        showIcon
        message="动作不可逆"
        description="焚毁后消息正文与附件将被清除且无法恢复。该操作会写入审计 admin_manual_destroy_message，并向会话成员推送 message:destroyed 事件。"
        style={{ marginBottom: 16 }}
      />
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
        目标消息 ID
      </div>
      <div className="cell-mono" style={{ marginBottom: 12, color: 'var(--text)' }}>
        {target || '—'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
        请手工输入上方消息 ID 以确认
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onPressEnter={onSubmit}
        placeholder="输入完整消息 ID"
        allowClear
        status={mismatched ? 'error' : undefined}
      />
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: mismatched ? 'var(--danger)' : 'var(--text-3)',
        }}
      >
        {mismatched ? '输入与目标消息 ID 不一致' : '需与目标消息 ID 完全一致才可提交'}
      </div>
    </Modal>
  );
};

export default DestroyMessageModal;
