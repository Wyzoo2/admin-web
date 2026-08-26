import { useEffect, useState } from 'react';
import { App, Descriptions, Drawer, Spin, Tag } from 'antd';
import dayjs from 'dayjs';
import { accountApi } from '../../../api/account';
import type { SafeUser } from '../../../types';

interface Props {
  id: string | null;
  onClose: () => void;
}

const fmt = (v?: string | null) =>
  v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-';

const AccountDetailDrawer: React.FC<Props> = ({ id, onClose }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SafeUser | null>(null);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    accountApi
      .detail(id)
      .then(setDetail)
      .catch((e: any) => message.error(e.message || '加载详情失败'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Drawer
      title="账号详情"
      open={!!id}
      onClose={onClose}
      width={480}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.phone}</Descriptions.Item>
            <Descriptions.Item label="姓名">
              {detail.display_name}
            </Descriptions.Item>
            <Descriptions.Item label="部门">
              {detail.department || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {detail.role === 'admin' ? (
                <Tag color="gold">管理员</Tag>
              ) : (
                <Tag>成员</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {detail.status === 'active' ? (
                <Tag color="success">正常</Tag>
              ) : (
                <Tag color="error">已停用</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="待强制改密">
              {detail.force_change_pwd ? (
                <Tag color="warning">是</Tag>
              ) : (
                '否'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="签名">
              {detail.signature || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {fmt(detail.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {fmt(detail.updated_at)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Drawer>
  );
};

export default AccountDetailDrawer;
