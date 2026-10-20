import { Tag } from 'antd';
import type { DeviceType } from '../../../types';

/** 类型元数据：color 省略时走 AntD 默认（desktop = 桌面 / default） */
interface DeviceTypeMeta {
  label: string;
  color?: string;
}

/** 用宽索引签名容纳后端可能新增的类型值，避免越界时运行期崩溃 */
const DEVICE_TYPE_META: Record<string, DeviceTypeMeta | undefined> = {
  mobile: { label: '手机', color: 'blue' },
  desktop: { label: '桌面', color: 'default' },
  tablet: { label: '平板', color: 'cyan' },
  web: { label: '网页', color: 'purple' },
};

/** 筛选行设备类型下拉：空值代表「全部」 */
export const DEVICE_TYPE_OPTIONS: { label: string; value: DeviceType | '' }[] = [
  { label: '全部类型', value: '' },
  { label: '手机', value: 'mobile' },
  { label: '桌面', value: 'desktop' },
  { label: '平板', value: 'tablet' },
  { label: '网页', value: 'web' },
];

interface DeviceTypeTagProps {
  type: DeviceType | string;
}

const DeviceTypeTag: React.FC<DeviceTypeTagProps> = ({ type }) => {
  const meta = DEVICE_TYPE_META[type];
  if (!meta) return <Tag>{type || '—'}</Tag>;
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export default DeviceTypeTag;
