import { useState } from 'react';
import { App, Button, Modal, Upload } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { accountApi } from '../../../api/account';
import type { BatchResult } from '../../../types';
import BatchResultView from './BatchResultView';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_SIZE = 5 * 1024 * 1024; // 后端限制 5MB

/** 账号导入模板（xlsx）base64 嵌入，避免依赖后端接口 */
const TEMPLATE_B64 =
  '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';

const TEMPLATE_FILE_NAME = '账号导入模板.xlsx';

/** 将 base64 字符串转为 Blob */
function b64toBlob(b64: string, type = 'application/octet-stream'): Blob {
  const byteChars = atob(b64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray as unknown as BlobPart], { type });
}

const ImportExcelModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const handleClose = () => {
    setResult(null);
    setFileList([]);
    onClose();
  };

  const handleUpload = async () => {
    const uf = fileList[0];
    if (!uf?.originFileObj) {
      message.warning('请先选择 xlsx 文件');
      return;
    }
    setLoading(true);
    try {
      const res = await accountApi.importExcel(uf.originFileObj as File);
      setResult(res);
      onSuccess();
    } catch (e: any) {
      message.error(e.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Excel 批量导入账号"
      open={open}
      onCancel={handleClose}
      width={760}
      footer={
        result ? (
          <Button type="primary" onClick={handleClose}>
            关闭
          </Button>
        ) : (
          <>
            <Button onClick={handleClose}>取消</Button>
            <Button
              type="primary"
              loading={loading}
              disabled={fileList.length === 0}
              onClick={handleUpload}
            >
              开始导入
            </Button>
          </>
        )
      }
      destroyOnHidden
    >
      {result ? (
        <BatchResultView result={result} />
      ) : (
        <>
          <p style={{ color: 'var(--text-2)', marginBottom: 12 }}>
            仅支持 .xlsx 文件（最大 5MB）；列名支持：phone/手机号、display_name/姓名、department/部门。
          </p>
          <p style={{ marginBottom: 16 }}>
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => {
                const blob = b64toBlob(TEMPLATE_B64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = TEMPLATE_FILE_NAME;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{ padding: 0 }}
            >
              下载导入模板
            </Button>
          </p>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              if (file.size > MAX_SIZE) {
                message.error('文件超过 5MB 限制');
                return Upload.LIST_IGNORE;
              }
              setFileList([
                { uid: file.uid, name: file.name, originFileObj: file },
              ]);
              return false; // 阻止自动上传，点击按钮时统一提交
            }}
            onRemove={() => setFileList([])}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 xlsx 文件到此区域</p>
            <p className="ant-upload-hint">单次仅支持一个文件</p>
          </Upload.Dragger>
        </>
      )}
    </Modal>
  );
};

export default ImportExcelModal;
