import { Table, Tag, Typography } from 'antd';
import type { BatchResult, BatchResultItem } from '../../../types';

interface Props {
  result: BatchResult;
}

/** 从宽松结构中尽力提取成功/失败明细（兼容后端不同的明细字段命名） */
function extract(result: BatchResult): {
  items: BatchResultItem[];
  successCount: number;
  failCount: number;
} {
  const asArray = (v: unknown): BatchResultItem[] =>
    Array.isArray(v) ? (v as BatchResultItem[]) : [];

  let items: BatchResultItem[] = [];
  if (Array.isArray(result.results)) items = result.results;
  else {
    items = [...asArray(result.success), ...asArray(result.fail)];
  }

  const successCount =
    typeof result.success_count === 'number'
      ? result.success_count
      : items.filter((i) => i.success !== false && !i.reason).length;
  const failCount =
    typeof result.fail_count === 'number'
      ? result.fail_count
      : items.filter((i) => i.success === false || !!i.reason).length;

  return { items, successCount, failCount };
}

const BatchResultView: React.FC<Props> = ({ result }) => {
  const { items, successCount, failCount } = extract(result);

  const columns = [
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      render: (v: string) => v || '-',
    },
    {
      title: '姓名',
      dataIndex: 'display_name',
      width: 110,
      render: (v: string) => v || '-',
    },
    {
      title: '结果',
      key: 'status',
      width: 80,
      render: (_: unknown, r: BatchResultItem) =>
        r.success === false || r.reason ? (
          <Tag className="tag-solid">失败</Tag>
        ) : (
          <Tag>成功</Tag>
        ),
    },
    {
      title: '初始密码 / 失败原因',
      key: 'detail',
      render: (_: unknown, r: BatchResultItem) => {
        const pwd = r.initial_password || r.password;
        if (r.success === false || r.reason) {
          return (
            <Typography.Text strong>
              {r.reason || r.message || '未知原因'}
            </Typography.Text>
          );
        }
        return pwd ? (
          <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
            {String(pwd)}
          </Typography.Paragraph>
        ) : (
          '-'
        );
      },
    },
  ];

  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        <Tag>成功 {successCount}</Tag>
        <Tag className={failCount > 0 ? 'tag-solid' : undefined}>
          失败 {failCount}
        </Tag>
        <span style={{ color: 'var(--text)', marginLeft: 8, fontWeight: 600 }}>
          初始密码仅本次显示，请立即导出或复制保存
        </span>
      </p>
      {items.length > 0 ? (
        <Table<BatchResultItem>
          rowKey={(r, i) => `${r.phone || 'row'}-${i}`}
          size="small"
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          scroll={{ y: 320 }}
        />
      ) : (
        <Typography.Paragraph
          code
          style={{ maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap' }}
        >
          {JSON.stringify(result, null, 2)}
        </Typography.Paragraph>
      )}
    </div>
  );
};

export default BatchResultView;
