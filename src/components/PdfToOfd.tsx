import React, { useState, useCallback } from 'react';
import { Upload, Button, Card, Progress, Alert, Space, Select, Checkbox, Typography, Row, Col, message } from 'antd';
import { InboxOutlined, FileWordOutlined, FileExcelOutlined, FilePptOutlined, FileImageOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ConversionOptions, ConversionResult, PdfFile } from '../types/pdf';
import './PdfToOfd.css';

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { Option } = Select;

const PdfToOfd: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile<PdfFile>[]>([]);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    conformance: 'standard',
    preserveSignatures: false,
    isInvoice: false,
  });

  const handleFileChange = useCallback(({ fileList }: { fileList: UploadFile<PdfFile>[] }) => {
    const filteredFiles = fileList.filter(file => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        message.error('只能上传PDF文件！');
        return false;
      }
      return true;
    });
    setFileList(filteredFiles);
  }, []);

  const getFilePath = (file: UploadFile<PdfFile>): string | undefined => {
    if (file.originFileObj instanceof File) {
      // @ts-ignore
      return file.originFileObj.path || (file.originFileObj as any).path;
    }
    // @ts-ignore
    return file.path || (file as any).path;
  };

  const handleBeforeUpload = (file: PdfFile) => {
    console.log('File object:', file);
    return false;
  };

  const handleConvert = async () => {
    if (fileList.length === 0) {
      message.error('请先选择要转换的PDF文件！');
      return;
    }

    const file = fileList[0];
    const filePath = getFilePath(file);
    
    if (!filePath) {
      message.error('无法获取文件路径！请确保使用本地文件。');
      console.error('File object:', file);
      return;
    }

    try {
      setConverting(true);
      setProgress(0);
      setResult(null);

      // 选择保存路径
      const outputPath = await window.electronAPI?.selectSavePath({
        defaultName: file.name.replace(/\.pdf$/i, '.ofd')
      });

      if (!outputPath?.success || !outputPath.filePath) {
        message.error('未选择保存路径！');
        return;
      }

      // 调用主进程进行转换
      const result = await window.electronAPI?.convertPDF({
        inputPath: filePath,
        outputPath: outputPath.filePath,
        type: 'ofd',
        options
      });

      if (result?.success) {
        setResult({
          success: true,
          outputPath: result.outputPath,
          pageCount: result.pageCount,
          conversionTime: result.conversionTime,
          fileSize: result.fileSize
        });
        message.success('转换成功！');
      } else {
        throw new Error(result?.error || '转换失败');
      }
    } catch (error: any) {
      console.error('转换失败:', error);
      setResult({
        success: false,
        error: error.message || '转换过程中发生错误'
      });
      message.error(`转换失败: ${error.message || '未知错误'}`);
    } finally {
      setConverting(false);
      setProgress(100);
    }
  };

  const handleOptionChange = (key: keyof ConversionOptions, value: unknown): void => {
    setOptions(prevOptions => ({
      ...prevOptions,
      [key]: value,
    }));
  };

  return (
    <div className="pdf-converter">
      {/* 顶部导航栏 */}
      <div className="top-nav">
        <div className="nav-content">
          <Text strong style={{ fontSize: 20 }}>工具箱</Text>
          <Space size={24}>
            <Text className="nav-item active">PDF工具</Text>
            <Text className="nav-item">图片工具</Text>
            <Text className="nav-item">二维码</Text>
            <Text className="nav-item">支持</Text>
          </Space>
        </div>
      </div>

      {/* 返回按钮 */}
      <Button type="link" className="back-button" icon={<ArrowLeftOutlined />}>
        返回
      </Button>

      {/* 页面标题 */}
      <Title className="page-title">PDF格式转换</Title>

      {/* 转换选项 */}
      <Text className="section-title">选择转换方式</Text>
      <Row gutter={[20, 20]} className="conversion-options">
        <Col span={12}>
          <Card className="option-card">
            <Text strong>PDF转Word</Text>
            <Text type="secondary">.pdf → .docx</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card className="option-card">
            <Text strong>PDF转Excel</Text>
            <Text type="secondary">.pdf → .xlsx</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card className="option-card">
            <Text strong>PDF转PPT</Text>
            <Text type="secondary">.pdf → .pptx</Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card className="option-card">
            <Text strong>PDF转图片</Text>
            <Text type="secondary">.pdf → .jpg/.png</Text>
          </Card>
        </Col>
      </Row>

      {/* 上传区域 */}
      <Dragger
        fileList={fileList}
        onChange={handleFileChange}
        beforeUpload={handleBeforeUpload}
        multiple={false}
        accept=".pdf"
        className="upload-area"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">拖放文件到这里</p>
        <p className="ant-upload-hint">或</p>
        <Button type="primary" className="select-file-btn">
          选择文件
        </Button>
      </Dragger>

      <div className="file-support-info">
        <Text type="secondary">支持的文件格式: PDF, DOCX, XLSX, PPTX, JPG, PNG</Text>
        <Text type="secondary">单个文件最大支持20MB</Text>
      </div>

      {/* 转换选项卡片 */}
      <Card className="conversion-card" title="转换选项">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>一致性级别：</Text>
            <Select
              value={options.conformance}
              onChange={value => handleOptionChange('conformance', value)}
            >
              <Option value="basic">基础级</Option>
              <Option value="standard">标准级</Option>
              <Option value="enhanced">增强级</Option>
            </Select>
          </div>

          <Checkbox
            checked={options.preserveSignatures}
            onChange={e => handleOptionChange('preserveSignatures', e.target.checked)}
          >
            保留数字签名
          </Checkbox>

          <Checkbox
            checked={options.isInvoice}
            onChange={e => handleOptionChange('isInvoice', e.target.checked)}
          >
            发票专用处理
          </Checkbox>
        </Space>
      </Card>

      {/* 转换按钮 */}
      <Button
        type="primary"
        onClick={handleConvert}
        loading={converting}
        disabled={fileList.length === 0}
        block
        className="select-file-btn"
        style={{ marginTop: 24 }}
      >
        开始转换
      </Button>

      {converting && <Progress percent={progress} status="active" />}

      {result && (
        <Alert
          type={result.success ? 'success' : 'error'}
          message={result.success ? '转换成功' : '转换失败'}
          description={
            result.success ? (
              <Space direction="vertical">
                <Text>输出文件：{result.outputPath}</Text>
                {result.pageCount && <Text>页数：{result.pageCount} 页</Text>}
                {result.conversionTime && <Text>耗时：{result.conversionTime.toFixed(2)} 秒</Text>}
                {result.fileSize && <Text>文件大小：{(result.fileSize / 1024).toFixed(2)} KB</Text>}
              </Space>
            ) : (
              result.error
            )
          }
        />
      )}
    </div>
  );
};

export default PdfToOfd; 