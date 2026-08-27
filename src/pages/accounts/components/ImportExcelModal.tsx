import { useState } from 'react';
import { App, Button, Modal, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
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
          <p style={{ color: 'var(--text-2)' }}>
            仅支持 .xlsx 文件（最大 5MB）；列名支持：phone/手机号、display_name/姓名、department/部门。
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
