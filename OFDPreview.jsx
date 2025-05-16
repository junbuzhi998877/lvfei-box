import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Form, 
  Select, 
  Checkbox, 
  Alert, 
  Space, 
  Spin, 
  Typography
} from 'antd';
import { InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * OFD预览和转换设置组件
 * 用于PDF转OFD时显示预览和设置转换参数
 */
const OFDPreview = ({ 
  visible, 
  onClose, 
  onConvert, 
  pdfPreview, 
  pdfFileName,
  isConverting = false,
  isInvoice = false
}) => {
  // 转换选项
  const [form] = Form.useForm();
  const [javaAvailable, setJavaAvailable] = useState(true);
  const [showHelpInfo, setShowHelpInfo] = useState(false);
  
  // 检查Java环境
  React.useEffect(() => {
    const checkJavaEnv = async () => {
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.checkJavaEnvironment();
          setJavaAvailable(result.available);
        } catch (error) {
          console.error('检查Java环境失败:', error);
          setJavaAvailable(false);
        }
      }
    };
    
    checkJavaEnv();
  }, []);
  
  // 处理转换请求
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
      title="PDF转OFD设置"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="back" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary"
          onClick={handleConvert}
          loading={isConverting}
          disabled={!javaAvailable}
        >
          开始转换
        </Button>
      ]}
      maskClosable={!isConverting}
      closable={!isConverting}
    >
      {!javaAvailable && (
        <Alert
          message="Java环境未检测到"
          description="PDF转OFD需要Java环境支持。请安装Java 8或更高版本，并确保已正确配置环境变量。"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {isInvoice && (
        <Alert
          message="检测到发票文档"
          description="系统检测到该PDF可能是发票文档，将使用针对发票优化的转换流程。"
          type="info"
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}
      
      <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginBottom: 16 }}>
        {/* 左侧预览 */}
        <div style={{ flex: 1, maxWidth: '60%' }}>
          <Title level={5}>文档预览</Title>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, height: 400, overflow: 'hidden' }}>
            {pdfPreview ? (
              <iframe
                src={pdfPreview}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="PDF Preview"
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin tip="加载预览..." />
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">文件名: {pdfFileName || '未指定文件'}</Text>
          </div>
        </div>
        
        {/* 右侧设置 */}
        <div style={{ flex: 1 }}>
          <Title level={5}>转换设置</Title>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              conformance: 'standard',
              preserveSignatures: true
            }}
          >
            <Form.Item
              name="conformance"
              label="OFD一致性级别"
              tooltip="选择OFD文档的标准符合性级别"
            >
              <Select>
                <Option value="basic">基本级别 (Basic)</Option>
                <Option value="standard">标准级别 (Standard)</Option>
                <Option value="enhanced">增强级别 (Enhanced)</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="preserveSignatures"
              valuePropName="checked"
            >
              <Checkbox>保留数字签名信息</Checkbox>
            </Form.Item>
            
            <Button 
              type="link" 
              icon={<InfoCircleOutlined />}
              onClick={() => setShowHelpInfo(!showHelpInfo)}
              style={{ paddingLeft: 0 }}
            >
              {showHelpInfo ? '隐藏说明' : '什么是OFD格式?'}
            </Button>
            
            {showHelpInfo && (
              <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, marginTop: 8 }}>
                <Title level={5}>关于OFD格式</Title>
                <p>OFD (Open Fixed-layout Document) 是中国自主研发的版式文档格式，是国家标准《GB/T 33190-2016 电子文件存储与交换格式版式文档》。</p>
                <p>转换级别说明:</p>
                <ul>
                  <li><strong>基本级别</strong>: 保留基本文本和图形元素，适合简单文档</li>
                  <li><strong>标准级别</strong>: 保留大部分格式和元素，适合常规使用</li>
                  <li><strong>增强级别</strong>: 尽可能保留所有格式特性，适合高保真需求</li>
                </ul>
                <p>注意: 部分复杂的PDF元素在转换过程中可能无法完全保留。</p>
              </div>
            )}
          </Form>
          
          {isConverting && (
            <div style={{ marginTop: 16 }}>
              <Spin spinning={true} />
              <Text style={{ marginLeft: 8 }}>正在转换，请稍候...</Text>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                大型PDF文件转换可能需要较长时间
              </Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OFDPreview;
