import React from 'react';
import { 
  Modal, 
  Button, 
  Form, 
  Select, 
  Checkbox, 
  Alert, 
  Space, 
  Typography
} from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ConversionOptions } from '../types/pdf';

const { Title, Text } = Typography;
const { Option } = Select;

interface OFDPreviewProps {
  visible: boolean;
  onClose: () => void;
  onConvert: (options: ConversionOptions) => void;
  pdfPreview: string | null;
  pdfFileName: string;
  isConverting: boolean;
  isInvoice: boolean;
}

const OFDPreview: React.FC<OFDPreviewProps> = ({
  visible,
  onClose,
  onConvert,
  pdfPreview,
  pdfFileName,
  isConverting,
  isInvoice,
}) => {
  const [form] = Form.useForm();

  const handleConvert = () => {
    form.validateFields().then(values => {
      onConvert({
        conformance: values.conformance,
        preserveSignatures: values.preserveSignatures,
        isInvoice: isInvoice
      });
    });
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      width={800}
      className="preview-modal"
      footer={[
        <Button 
          key="back" 
          onClick={onClose}
          className="cancel-button"
          disabled={isConverting}
        >
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary"
          onClick={handleConvert}
          loading={isConverting}
          className="convert-button"
        >
          开始转换
        </Button>
      ]}
      maskClosable={!isConverting}
      closable={!isConverting}
    >
      <div className="preview-header">
        <Title level={4}>PDF转OFD设置</Title>
      </div>

      {isInvoice && (
        <Alert
          message="检测到发票文档"
          description="系统检测到该PDF可能是发票文档，将使用针对发票优化的转换流程。"
          type="info"
          icon={<CheckCircleOutlined />}
          className="invoice-alert"
        />
      )}

      <div className="preview-content">
        <div className="file-info">
          <Text strong className="file-name">{pdfFileName}</Text>
        </div>

        {pdfPreview && (
          <div className="pdf-preview">
            <iframe
              src={pdfPreview}
              title="PDF Preview"
              className="preview-frame"
            />
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          className="conversion-form"
          initialValues={{
            conformance: 'standard',
            preserveSignatures: false
          }}
        >
          <Form.Item
            label="一致性级别"
            name="conformance"
            className="form-item"
          >
            <Select>
              <Option value="basic">基础级</Option>
              <Option value="standard">标准级</Option>
              <Option value="enhanced">增强级</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="preserveSignatures"
            valuePropName="checked"
            className="form-item"
          >
            <Checkbox>保留数字签名</Checkbox>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default OFDPreview; 