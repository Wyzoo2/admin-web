import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { presenceApi } from '../../../api/admin';
import type {
  OnlineUserQuery,
  OnlineUserView,
  PresenceDevice,
} from '../../../types/admin';
import IdText from '../../../components/IdText';
import { useAuthStore } from '../../../store/auth';
import { EMPTY, formatAbsoluteTime, formatRelativeTime } from './presenceFormat';

/** 后端 pageSize 上限 100（101 直接 400） */
const MAX_PAGE_SIZE = 100;
/** 服务端分页，默认 20 位/页 */
const UI_PAGE_SIZE = 20;

/** 主信息单行：超长省略，禁止折行 */
const PRIMARY_STYLE: React.CSSProperties = {
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/** 次信息（手机号等）统一 11px 次要色 */
const SECONDARY_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-3)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

interface UserPresenceTableProps {
  /** 已提交的服务端关键字（后端按手机号/昵称过滤） */
  keyword: string;
  /** 父级刷新（刷新按钮 / 强制下线后）自增，触发重新拉取 */
  reloadToken: number;
  /** 强制下线成功后通知父级刷新设备列表与概览 */
  onForceOfflineDone: () => void;
}

/**
 * 按用户视图：直接消费 GET /presence/online（服务端已按用户聚合），
 * 前端不再拉全量设备自行分组；逐用户强制下线时按手机号取该用户设备。
 */
const UserPresenceTable: React.FC<UserPresenceTableProps> = ({
  keyword,
  reloadToken,
  onForceOfflineDone,
}) => {
  const { message } = App.useApp();
  const currentDeviceId = useAuthStore((s) => s.deviceId);

  const [rows, setRows] = useState<OnlineUserView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  /** 只接受最后一次请求的结果，避免快速切换筛选时旧响应覆盖新数据 */
  const reqSeq = useRef(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_PAGE_SIZE);

  const keywordRef = useRef(keyword);

  useEffect(() => {
    // 关键字变化后先回到第一页（页码归位会再次触发本 effect，故此处不请求）
    const keywordChanged = keywordRef.current !== keyword;
    keywordRef.current = keyword;
    if (keywordChanged && page !== 1) {
      setPage(1);
      return;
    }

    const seq = reqSeq.current + 1;
    reqSeq.current = seq;
    const params: OnlineUserQuery = { page, pageSize };
    const kw = keyword.trim();
    if (kw) params.keyword = kw;
    setLoading(true);
    presenceApi
      .onlineUsers(params)
      .then((res) => {
        if (reqSeq.current !== seq) return;
        setRows(res?.data ?? []);
        setTotal(res?.total ?? 0);
      })
      .catch((e: unknown) => {
        if (reqSeq.current !== seq) return;
        // 失败保持空态，不沿用旧数据（避免下线后仍展示已踢掉的用户）
        setRows([]);
        setTotal(0);
        message.error(
          `在线用户加载失败：${
            e instanceof Error && e.message ? e.message : '接口未就绪'
          }`,
        );
      })
      .finally(() => {
        if (reqSeq.current === seq) setLoading(false);
      });
  }, [keyword, page, pageSize, reloadToken, message]);

  const isCurrentDevice = useCallback(
    (d: PresenceDevice) =>
      !!currentDeviceId && d.device_fingerprint === currentDeviceId,
    [currentDeviceId],
  );

  const [target, setTarget] = useState<OnlineUserView | null>(null);
  /** 弹窗内加载的该用户设备（已按 user_id 精确过滤） */
  const [targetDevices, setTargetDevices] = useState<PresenceDevice[]>([]);
  const [targetLoading, setTargetLoading] = useState(false);
  /** 加载失败或没取到设备：禁用提交并提示 */
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const targetSeq = useRef(0);
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开时按该用户手机号取设备：keyword 是子串匹配，再用 user_id 精确过滤避免误伤
  useEffect(() => {
    targetSeq.current += 1;
    const seq = targetSeq.current;
    setTyped('');
    setTargetDevices([]);
    setTargetUnavailable(false);
    if (!target) return;

    setTargetLoading(true);
    presenceApi
      .devices({ keyword: target.phone, page: 1, pageSize: MAX_PAGE_SIZE })
      .then((res) => {
        if (targetSeq.current !== seq) return;
        const mine = (res?.data ?? []).filter((d) => d.user_id === target.id);
        setTargetDevices(mine);
        setTargetUnavailable(mine.length === 0);
      })
      .catch((e: unknown) => {
        if (targetSeq.current !== seq) return;
        setTargetUnavailable(true);
        message.error(
          `该用户在线设备加载失败：${
            e instanceof Error && e.message ? e.message : '接口未就绪'
          }`,
        );
      })
      .finally(() => {
        if (targetSeq.current === seq) setTargetLoading(false);
      });
  }, [target, message]);

  const targetOnlineDevices = useMemo(
    () => targetDevices.filter((d) => d.is_online),
    [targetDevices],
  );
  /** 可踢设备：在线且不是当前设备（踢自己会让当前会话立即失效） */
  const targetKickable = useMemo(
    () => targetOnlineDevices.filter((d) => !isCurrentDevice(d)),
    [targetOnlineDevices, isCurrentDevice],
  );
  const targetSkipped = useMemo(
    () => targetOnlineDevices.some(isCurrentDevice),
    [targetOnlineDevices, isCurrentDevice],
  );
  /** 校验串：优先手机号，无手机号则要求输入用户 id */
  const confirmKey = target ? target.phone || target.id : '';
  const matched = target != null && typed.trim() === confirmKey;
  const canSubmit =
    matched && !submitting && !targetLoading && targetKickable.length > 0;

  const handleConfirm = async () => {
    if (!target || !canSubmit) return;
    setSubmitting(true);
    let ok = 0;
    let failed = 0;
    // 逐个顺序调用：并发下线同一用户的多台设备时，后端审计顺序更可读
    for (const d of targetKickable) {
      try {
        await presenceApi.forceOffline(d.id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setSubmitting(false);
    setTarget(null);
    if (ok > 0) {
      message.success(
        `已下线 ${ok} 台设备${failed > 0 ? `，${failed} 台失败` : ''}${
          targetSkipped ? '（已跳过当前设备）' : ''
        }`,
      );
    } else {
      message.error(`下线失败：${failed} 台设备均未成功`);
    }
    onForceOfflineDone();
  };

  const columns: ColumnsType<OnlineUserView> = [
    {
      title: '用户',
      key: 'user',
      width: 220,
      render: (_, row) => {
        const name = row.display_name ?? row.phone;
        return (
          <div style={{ lineHeight: 1.4, minWidth: 0 }}>
            <Tooltip title={name} mouseEnterDelay={0.3}>
              <div style={{ ...PRIMARY_STYLE, fontSize: 13 }}>
                {name || EMPTY}
              </div>
            </Tooltip>
            <div style={SECONDARY_STYLE}>{row.phone || EMPTY}</div>
          </div>
        );
      },
    },
    {
      title: '在线设备数',
      dataIndex: 'online_devices',
      width: 110,
      align: 'right',
      render: (v: number | undefined) => (
        <Tooltip
          title="该用户当前在线设备数（由 /presence/online 服务端聚合）"
          mouseEnterDelay={0.3}
        >
          <span
            style={{
              color: v ? 'var(--text)' : 'var(--text-3)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {(v ?? 0).toLocaleString()}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '在线状态',
      dataIndex: 'is_online',
      width: 110,
      render: (v: boolean) =>
        v ? (
          <Badge status="success" text="在线" />
        ) : (
          <Badge status="default" text="离线" />
        ),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      width: 200,
      render: (v: string | null) => (
        <Tooltip
          title={`相对时间：${formatRelativeTime(v)}`}
          mouseEnterDelay={0.3}
        >
          <span
            style={{
              whiteSpace: 'nowrap',
              color: v ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {formatAbsoluteTime(v)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, row) => (
        // disabled 按钮不触发鼠标事件，外层 span 承接 Tooltip
        <Tooltip
          title="打开后按手机号取该用户设备，可一次性下线其全部在线设备（跳过当前设备）"
          mouseEnterDelay={0.2}
        >
          <span style={{ display: 'inline-block' }}>
            <Button
              size="small"
              danger
              onClick={() => {
                setTarget(row);
              }}
            >
              强制下线该用户
            </Button>
          </span>
        </Tooltip>
      ),
    },
  ];

  /** 220+110+110+200+160，列宽之和必须等于 scroll.x */
  const TABLE_WIDTH = 800;

  return (
    <>
      <Table<OnlineUserView>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: TABLE_WIDTH }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: 'var(--text-3)' }}>
                  {keyword.trim() ? `没有匹配「${keyword.trim()}」的在线用户` : '当前无在线用户'}
                </span>
              }
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: (t) => `共 ${t} 位在线用户`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        open={target != null}
        title="强制下线该用户"
        okText="确认下线"
        cancelText="取消"
        confirmLoading={submitting}
        okButtonProps={{ danger: true, disabled: !canSubmit }}
        onOk={() => {
          void handleConfirm();
        }}
        onCancel={() => setTarget(null)}
      >
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.8,
            color: 'var(--text-2)',
            marginBottom: 14,
          }}
        >
          将踢掉该用户的
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            {' '}
            {targetKickable.length} 台设备
          </span>
          ，被踢设备下次请求
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            立即返回 401
          </span>
          ，动作写入审计
          <span className="cell-mono">admin_force_offline_device</span>。
          {targetSkipped && (
            <div style={{ marginTop: 4, color: 'var(--text-3)' }}>
              已跳过当前设备（不能下线自己）。
            </div>
          )}
        </div>

        <div
          style={{
            padding: '10px 12px',
            marginBottom: 14,
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-2)',
            lineHeight: 1.9,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: 4 }}>
            用户：{target?.display_name ?? target?.phone ?? EMPTY}
            {target?.phone ? `（${target.phone}）` : '（无手机号）'}
          </div>
          <div style={{ color: 'var(--text-3)', marginBottom: 6 }}>
            该用户名下在线设备：
          </div>
          {targetLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                color: 'var(--text-3)',
              }}
            >
              <Spin size="small" />
              <span style={{ fontSize: 12 }}>正在按手机号加载该用户设备…</span>
            </div>
          ) : targetOnlineDevices.length === 0 ? (
            <div style={{ color: 'var(--text-3)' }}>
              {targetUnavailable
                ? '未取到该用户设备，无法提交下线'
                : '该用户当前没有在线设备'}
            </div>
          ) : (
            targetOnlineDevices.map((d) => {
              const isCurrent = isCurrentDevice(d);
              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      ...SECONDARY_STYLE,
                      fontSize: 12,
                      color: isCurrent ? 'var(--text-3)' : 'var(--text)',
                    }}
                  >
                    {d.device_name || EMPTY}
                  </span>
                  <IdText value={d.id} />
                  {isCurrent && (
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      当前设备，跳过
                    </Tag>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
          为避免误操作，请输入该用户的
          {target?.phone ? '手机号' : '用户 ID（该用户无手机号）'}
          {' → '}一致后才能提交：
        </div>
        <Input
          value={typed}
          placeholder={target?.phone ? '输入用户手机号' : '输入用户 ID'}
          allowClear
          disabled={targetLoading || targetUnavailable}
          onChange={(e) => setTyped(e.target.value)}
          onPressEnter={() => {
            void handleConfirm();
          }}
        />
        {typed.length > 0 && !matched && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
            {target?.phone ? '手机号' : '用户 ID'}不匹配，无法提交
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserPresenceTable;
