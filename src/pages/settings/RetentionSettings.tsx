import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Skeleton,
} from 'antd';
import type { Rule } from 'antd/es/form';
import { retentionApi } from '../../api/admin';
import type {
  RetentionSettings as RetentionSettingsData,
  RetentionSettingsPatch,
} from '../../types/admin';

/**
 * 字段说明走 Form.Item 的 extra：单位 + 语义都留在字段下方，
 * 11px 淡色是为了让说明退到视觉次层，不再和 13px 标签抢注意力。
 */
const extraHint = (text: string) => (
  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{text}</span>
);

/** 整数区间校验：必填 + 范围 + 整数，提示统一为中文 */
function intRules(label: string, min: number, max: number): Rule[] {
  const message = `${label}需为 ${min}–${max} 的整数`;
  return [
    { required: true, message: `请输入${label}` },
    { type: 'number', min, max, message },
    {
      validator: (_rule, value) =>
        value === undefined || value === null || Number.isInteger(value)
          ? Promise.resolve()
          : Promise.reject(new Error(message)),
    },
  ];
}

const RetentionSettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RetentionSettingsData>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** 已加载的服务端快照，用于 diff 提交与「重置」 */
  const [snapshot, setSnapshot] = useState<RetentionSettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [restartHint, setRestartHint] = useState(false);

  const ackFallbackDays: number | null | undefined = Form.useWatch(
    'ack_fallback_days',
    form,
  );
  const purgeAckThreshold: number | null | undefined = Form.useWatch(
    'purge_ack_threshold',
    form,
  );
  const burnFallbackHours: number | null | undefined = Form.useWatch(
    'burn_fallback_hours',
    form,
  );
  const onlineTtlSeconds: number | null | undefined = Form.useWatch(
    'online_ttl_seconds',
    form,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await retentionApi.get();
      setSnapshot(data);
      form.setFieldsValue(data);
    } catch (e) {
      setSnapshot(null);
      setLoadError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 只包含与已加载快照不同的字段（后端按 patch 语义合并） */
  const patch = useMemo<RetentionSettingsPatch>(() => {
    const next: RetentionSettingsPatch = {};
    if (!snapshot) return next;
    if (
      typeof ackFallbackDays === 'number' &&
      ackFallbackDays !== snapshot.ack_fallback_days
    ) {
      next.ack_fallback_days = ackFallbackDays;
    }
    if (
      typeof purgeAckThreshold === 'number' &&
      purgeAckThreshold !== snapshot.purge_ack_threshold
    ) {
      next.purge_ack_threshold = purgeAckThreshold;
    }
    if (
      typeof burnFallbackHours === 'number' &&
      burnFallbackHours !== snapshot.burn_fallback_hours
    ) {
      next.burn_fallback_hours = burnFallbackHours;
    }
    if (
      typeof onlineTtlSeconds === 'number' &&
      onlineTtlSeconds !== snapshot.online_ttl_seconds
    ) {
      next.online_ttl_seconds = onlineTtlSeconds;
    }
    return next;
  }, [ackFallbackDays, purgeAckThreshold, burnFallbackHours, onlineTtlSeconds, snapshot]);

  /**
   * 服务端 editable 是唯一可写性依据：实测为 false（策略由环境变量控制，PUT 返回 404），
   * 此时页面只读、保存按钮不渲染，且绝不调用 retentionApi.update。
   */
  const editable = snapshot?.editable === true;
  const dirty = Object.keys(patch).length > 0;
  const readonly = loading || loadError !== null || !editable;

  const onFinish = async () => {
    // 只读态不发写请求，避免命中未实现的 PUT /admin/settings/retention（404）
    if (!editable || !snapshot || Object.keys(patch).length === 0) return;
    setSaving(true);
    try {
      await retentionApi.update(patch);
      // 已提交字段即服务端新值，直接并入快照，避免再次跳回未改动态
      const next: RetentionSettingsData = { ...snapshot, ...patch };
      setSnapshot(next);
      form.setFieldsValue(next);
      setRestartHint(true);
      message.success('保留策略已保存');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (snapshot) form.setFieldsValue(snapshot);
  };

  return (
    <Card title="数据保留策略">
      {/* 880 宽居中：超宽屏上一行说明不会横跨整屏，表单也不会缩在左侧 420px 里 */}
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
          以下阈值由后端定时任务直接消费，前端只负责展示与提交，不做本地换算。
        </div>

        {loadError === null && snapshot !== null && !editable && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
            message={
              snapshot.note
                ? '保留策略由服务端环境变量控制'
                : '当前策略只读'
            }
            description={
              <>
                {snapshot.note && <div>{snapshot.note}</div>}
                {!editable && <div>当前为只读状态，页面上无法修改。</div>}
              </>
            }
          />
        )}

        {loadError !== null && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
            message="无法读取保留策略"
            description={
              <div>
                <div>
                  后端接口 <span className="cell-mono">/admin/settings/retention</span>{' '}
                  尚未实现或不可用，表单已进入只读状态。
                </div>
                <div style={{ color: 'var(--text-2)', margin: '6px 0 10px' }}>
                  错误信息：{loadError}
                </div>
                <Button size="small" onClick={load} loading={loading}>
                  重试
                </Button>
              </div>
            }
          />
        )}

        {loading && loadError === null ? (
          <Skeleton active title={false} paragraph={{ rows: 6 }} />
        ) : (
          <Form<RetentionSettingsData>
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            disabled={readonly}
            style={{ width: '100%' }}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="ack_fallback_days"
                  label="确认回退天数"
                  extra={extraHint(
                    '单位：天。超期仍未被确认的消息会被强制真删，默认 7 天。值越大，已焚毁消息在库中驻留越久。',
                  )}
                  rules={intRules('确认回退天数', 0, 365)}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={0}
                    min={0}
                    max={365}
                    placeholder="默认 7"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="purge_ack_threshold"
                  label="真删确认阈值"
                  extra={extraHint(
                    '单位：人。群聊中确认人数达到该阈值才触发真删。设为 1 时任一成员确认即真删，其余成员只能靠墓碑看到占位。',
                  )}
                  rules={intRules('真删确认阈值', 1, 100)}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={0}
                    min={1}
                    max={100}
                    placeholder="1 表示任一成员确认即可"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="burn_fallback_hours"
                  label="焚毁兜底时长"
                  extra={extraHint(
                    '单位：小时。等待确认的兜底时长，超过后由后端强制推进焚毁流程，默认 24 小时。',
                  )}
                  rules={intRules('焚毁兜底时长', 1, 720)}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={0}
                    min={1}
                    max={720}
                    placeholder="默认 24"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="online_ttl_seconds"
                  label="在线判定 TTL"
                  extra={extraHint(
                    '单位：秒。超过该时长未上报心跳即判定为离线，默认 150 秒。',
                  )}
                  rules={intRules('在线判定 TTL', 30, 3600)}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    precision={0}
                    min={30}
                    max={3600}
                    placeholder="默认 150"
                  />
                </Form.Item>
              </Col>
            </Row>

            {editable ? (
              <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Button
                    htmlType="submit"
                    type="primary"
                    loading={saving}
                    disabled={!dirty || readonly}
                    style={{ boxShadow: '0 0 0' }}
                  >
                    保存
                  </Button>
                  <Button htmlType="button" onClick={onReset} disabled={readonly || !dirty}>
                    重置
                  </Button>
                  {!dirty && !readonly && (
                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>无改动</span>
                  )}
                </div>
              </Form.Item>
            ) : (
              <Form.Item style={{ marginBottom: 0, marginTop: 4 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                  只读状态：无法在页面修改阈值。
                </span>
              </Form.Item>
            )}
          </Form>
        )}

        {restartHint && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 20 }}
            message="生效方式"
            description="若后端保留策略由环境变量驱动，修改需重启服务端生效；落库模式则即时生效。"
          />
        )}
      </div>
    </Card>
  );
};

export default RetentionSettings;
