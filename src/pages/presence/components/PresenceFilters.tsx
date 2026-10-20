import { Button, Input, Select, Switch, Tooltip } from 'antd';
import {
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { DeviceType } from '../../../types';
import { DEVICE_TYPE_OPTIONS } from './DeviceTypeTag';

export interface PresenceFilterState {
  /** 映射接口参数 online_only */
  onlineOnly: boolean;
  /** 映射接口参数 device_type，'' 表示不传 */
  deviceType: DeviceType | '';
  /** 契约无此参数：仅做客户端过滤，不进入请求 */
  keyword: string;
}

interface PresenceFiltersProps {
  value: PresenceFilterState;
  onChange: (next: PresenceFilterState) => void;
  onRefresh: () => void;
  loading: boolean;
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-2)',
  whiteSpace: 'nowrap',
};

/** 与 Input / Select 默认高度对齐，保证同一行控件垂直居中 */
const controlStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/**
 * 紧凑工具栏：短控件用固定宽度并按需换行。
 * 之前用 24 栅格 + width:100%，宽屏上会把「仅在线」和下拉撑到 1/4 屏宽，视觉上过空。
 */
const PresenceFilters: React.FC<PresenceFiltersProps> = ({
  value,
  onChange,
  onRefresh,
  loading,
}) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div style={controlStyle}>
        <span style={labelStyle}>仅在线</span>
        <Switch
          checked={value.onlineOnly}
          onChange={(checked) => onChange({ ...value, onlineOnly: checked })}
        />
      </div>

      <div style={controlStyle}>
        <span style={labelStyle}>设备类型</span>
        <Select<DeviceType | ''>
          value={value.deviceType}
          style={{ width: 150 }}
          options={DEVICE_TYPE_OPTIONS}
          onChange={(deviceType) => onChange({ ...value, deviceType })}
        />
      </div>

      <div style={controlStyle}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: 'var(--text-3)' }} />}
          placeholder="用户 ID / 昵称 / 手机号 / 设备指纹 / 设备名"
          value={value.keyword}
          style={{ width: 300 }}
          onChange={(e) => onChange({ ...value, keyword: e.target.value })}
        />
        <Tooltip
          title="后端契约仅支持 online_only / device_type / page / pageSize，该关键字不进入请求，只对当前页已加载的数据做客户端过滤。"
          mouseEnterDelay={0.2}
        >
          <InfoCircleOutlined style={{ color: 'var(--text-3)' }} />
        </Tooltip>
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={onRefresh}>
          刷新
        </Button>
      </div>
    </div>

    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
      关键字为客户端过滤（契约未提供该参数），仅作用于当前页已加载的设备。
    </div>
  </div>
);

export default PresenceFilters;
