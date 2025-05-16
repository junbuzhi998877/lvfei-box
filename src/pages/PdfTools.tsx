import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Upload, 
  Button, 
  Card, 
  Space,
  Modal,
  message,
  Steps,
  Radio,
  Spin
} from 'antd';
import { 
  UploadOutlined, 
  ArrowLeftOutlined,
  DeleteOutlined,
  EyeOutlined,
  SaveOutlined,
  SearchOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import OFDPreview from '../components/OFDPreview';
import PdfToOfd from '../components/PdfToOfd';
import '../styles/PdfTools.css';

// ElectronAPI 接口定义
interface ElectronAPI {
  getAppInfo: () => Promise<any>;
  convertPDF: (options: any) => Promise<any>;
  convertPDFBatch: (options: any) => Promise<any>;
  convertPDFBatchToOFD: (options: any) => Promise<any>;
  compressImage: (options: any) => Promise<any>;
  processImage: (options: any) => Promise<any>;
  generateQR: (options: any) => Promise<any>;
  saveQR: (options: any) => Promise<any>;
  saveBatchQR: (options: any) => Promise<any>;
  selectSavePath: (options: any) => Promise<any>;
  saveBatchImages: (options: any) => Promise<any>;
  checkJavaEnvironment: () => Promise<any>;
  detectInvoice: (options: any) => Promise<any>;
  uploadImage: (options: any) => Promise<any>;
  deleteFile: (filePath: string) => Promise<any>;
  onMenuAction: (callback: (action: string) => void) => () => void;
  onFileOpened: (callback: (fileInfo: any) => void) => () => void;
  launchExternalPdfApp: (options: any) => Promise<any>;
  readLogFile: () => Promise<any>;
}

// 全局Window接口扩展
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;

interface ProcessingFile {
  uid: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  originalSize?: number;
  error?: string;
  preview?: string;
  path?: string;
  outputPath?: string;
}

const PdfTools: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<string>('docx');
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showOfdPreview, setShowOfdPreview] = useState(false);
  const [ofdPreviewState, setOfdPreviewState] = useState<{
    pdfFile: ProcessingFile | null;
    outputDir: string;
    isConverting?: boolean;
    isInvoice?: boolean;
  }>({ pdfFile: null, outputDir: '' });
  const [currentStep, setCurrentStep] = useState(0);
  const [conversionDirection, setConversionDirection] = useState<'pdfToOther' | 'otherToPdf'>('pdfToOther');
  const [isCheckingInvoice, setIsCheckingInvoice] = useState(false);

  // 转换选项卡片数据
  const conversionOptions = [
    {
      key: 'docx',
      title: 'Word',
      description: '.pdf → .docx',
      icon: <FileWordOutlined style={{ fontSize: 28, color: '#ffffff' }} />,
      color: '#fa3c52'
    },
    {
      key: 'xlsx',
      title: 'Excel',
      description: '.pdf → .xlsx',
      icon: <FileExcelOutlined style={{ fontSize: 28, color: '#ffffff' }} />,
      color: '#107c41'
    },
    {
      key: 'pptx',
      title: 'PowerPoint',
      description: '.pdf → .pptx',
      icon: <FilePptOutlined style={{ fontSize: 28, color: '#ffffff' }} />,
      color: '#d04423'
    },
    {
      key: 'jpg',
      title: '图片',
      description: '.pdf → .jpg/.png',
      icon: <FileImageOutlined style={{ fontSize: 28, color: '#ffffff' }} />,
      color: '#38b6ff'
    },
    {
      key: 'ofd',
      title: 'OFD',
      description: '.pdf → .ofd',
      icon: <FileTextOutlined style={{ fontSize: 28, color: '#ffffff' }} />,
      color: '#6a0dad'
    }
  ];

  // 处理文件上传
  const handleBeforeUpload = async (file: RcFile) => {
    console.log('处理文件上传:', file.name);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      message.error('请上传PDF格式的文件');
      return false;
    }

    if (file.size > 20 * 1024 * 1024) {
      message.error('文件大小不能超过20MB');
      return false;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      const newFile: ProcessingFile = {
        uid: file.name + Date.now(),
        name: file.name,
        status: 'pending',
        progress: 0,
        originalSize: file.size,
        preview: dataUrl
      };

      if (window.electronAPI) {
        const result = await window.electronAPI.uploadImage({
          dataUrl,
          fileName: file.name
        });

        if (result.success) {
          const newProcessingFile = {
            ...newFile,
            path: result.filePath
          };
          
          setProcessingFiles(prev => [...prev, newProcessingFile]);
          message.success(`${file.name} 上传成功`);
          
          // 如果选择的是OFD格式，检测是否为发票
          if (selectedFormat === 'ofd') {
            try {
              setIsCheckingInvoice(true);
              await checkIfInvoice(newProcessingFile);
            } finally {
              setIsCheckingInvoice(false);
            }
          }
          
          // 上传成功后自动前进到下一步
          if (currentStep === 2) {
            // 已经是最后一步，不需要前进
          }
        } else {
          throw new Error(result.error || '上传失败');
        }
      } else {
        throw new Error('系统功能不可用');
      }
    } catch (error: any) {
      message.error(`上传失败: ${error.message}`);
    }

    return false;
  };

  // 检测是否为发票
  const checkIfInvoice = async (file: ProcessingFile) => {
    if (!window.electronAPI || !window.electronAPI.detectInvoice || !file.path) {
      return;
    }
    
    try {
      const result = await window.electronAPI.detectInvoice({
        pdfPath: file.path
      });
      
      if (result.success && result.isInvoice) {
        message.info('检测到上传文件可能是发票，将使用专用处理流程');
        
        // 更新发票状态
        setOfdPreviewState(prev => ({
          ...prev,
          isInvoice: true
        }));
      }
    } catch (error: any) {
      console.error('发票检测失败:', error);
      // 检测失败不阻止后续流程
    }
  };

  // 处理批量转换
  const handleBatchConvert = async () => {
    if (processingFiles.length === 0) {
      message.warning('请先添加PDF文件');
      return;
    }

    setIsProcessing(true);

    try {
      if (!window.electronAPI) {
        throw new Error('系统功能不可用');
      }

      const saveResult = await window.electronAPI.selectSavePath({
        defaultName: '选择保存目录'
      });

      if (!saveResult.success || !saveResult.filePath) {
        setIsProcessing(false);
        return;
      }

      const outputDir = saveResult.filePath;

      // 如果是OFD格式，需要特殊处理
      if (selectedFormat === 'ofd') {
        setShowOfdPreview(true);
        setOfdPreviewState({
          pdfFile: processingFiles[0],
          outputDir,
          isInvoice: ofdPreviewState.isInvoice
        });
        setIsProcessing(false);
        return;
      }

      // 处理其他格式的常规转换
      for (const file of processingFiles) {
        if (file.status === 'success') continue;

        try {
          setProcessingFiles(prev => 
            prev.map(f => 
              f.uid === file.uid 
                ? { ...f, status: 'processing', progress: 10 }
                : f
            )
          );

          const baseName = file.name.replace('.pdf', '');
          const outputPath = `${outputDir}/${baseName}.${selectedFormat}`;

          const result = await window.electronAPI.convertPDF({
            inputPath: file.path!,
            outputPath,
            type: selectedFormat,
            options: {
              quality: 100,
              dpi: 300,
              preserveFormatting: true
            }
          });

          setProcessingFiles(prev =>
            prev.map(f =>
              f.uid === file.uid
                ? {
                    ...f,
                    status: result.success ? 'success' : 'error',
                    progress: result.success ? 100 : 0,
                    error: result.error,
                    outputPath: result.success ? outputPath : undefined
                  }
                : f
            )
          );

          if (result.success) {
            message.success(`${file.name} 转换成功`);
          } else {
            throw new Error(result.error || '转换失败');
          }
        } catch (error: any) {
          console.error(`处理文件 ${file.name} 时出错:`, error);
          message.error(`${file.name} 处理失败: ${error.message}`);
        }
      }

      message.success('批量转换完成！');
    } catch (error: any) {
      console.error('批量处理错误:', error);
      message.error(`批量处理失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 设置当前步骤
  const setStep = (step: number) => {
    // 确保步骤在有效范围内
    if (step >= 0 && step <= 2) {
      setCurrentStep(step);
    }
  };

  // 前进到下一步
  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 辅助函数：读取文件为DataURL
  const readFileAsDataURL = (file: RcFile): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  // 格式化文件大小
  const formatFileSize = (size?: number) => {
    if (!size) return '未知';
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let fileSize = size;
    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024;
      index++;
    }
    return `${fileSize.toFixed(2)} ${units[index]}`;
  };

  // 处理OFD转换
  const handleOfdConvert = async (options: any) => {
    if (!ofdPreviewState.pdfFile || !ofdPreviewState.outputDir) {
      message.error('文件信息不完整');
      return;
    }

    // 标记转换进行中
    setOfdPreviewState(prev => ({ ...prev, isConverting: true }));
    
    try {
      const file = ofdPreviewState.pdfFile;
      const outputDir = ofdPreviewState.outputDir;
      
      // 更新文件状态为处理中
      setProcessingFiles(prev => 
        prev.map(f => 
          f.uid === file.uid 
            ? { ...f, status: 'processing', progress: 10 }
            : f
        )
      );
      
      const baseName = file.name.replace('.pdf', '');
      const outputPath = `${outputDir}/${baseName}.ofd`;
      
      if (!window.electronAPI) {
        throw new Error('系统功能不可用');
      }
      
      // 合并转换选项
      const convertOptions = {
        ...options,
        isInvoice: ofdPreviewState.isInvoice || false
      };
      
      // 调用转换API
      const result = await window.electronAPI.convertPDF({
        inputPath: file.path!,
        outputPath,
        type: 'ofd',
        options: convertOptions
      });
      
      // 更新处理状态
      setProcessingFiles(prev =>
        prev.map(f =>
          f.uid === file.uid
            ? {
                ...f,
                status: result.success ? 'success' : 'error',
                progress: result.success ? 100 : 0,
                error: result.error,
                outputPath: result.success ? outputPath : undefined
              }
            : f
        )
      );
      
      if (result.success) {
        message.success(`${file.name} 转换成功`);
        // 关闭预览窗口
        setShowOfdPreview(false);
      } else {
        throw new Error(result.error || '转换失败');
      }
    } catch (error: any) {
      console.error('OFD转换错误:', error);
      message.error(`OFD转换失败: ${error.message}`);
    } finally {
      setOfdPreviewState(prev => ({ ...prev, isConverting: false }));
    }
  };

  // 删除处理文件
  const handleDeleteFile = (fileUid: string) => {
    setProcessingFiles(prev => prev.filter(f => f.uid !== fileUid));
  };

  // 处理文件预览
  const handlePreviewFile = (previewUrl: string | undefined) => {
    if (previewUrl) {
      setPreviewUrl(previewUrl);
    } else {
      message.warning('无法预览该文件');
    }
  };

  // 当PDF格式转OFD被选择时
  const handleOfdFormatSelection = async () => {
    message.info('正在启动外部PDF转OFD工具...');
    
    try {
      // 检查electronAPI是否可用
      if (!window.electronAPI) {
        message.error('Electron API不可用');
        return;
      }
      
      // 如果用户已经上传了文件，则直接使用该文件
      if (processingFiles.length > 0 && processingFiles[0].path) {
        const result = await window.electronAPI.launchExternalPdfApp({
          pdfPath: processingFiles[0].path
        });
        
        // 检查启动结果
        if (result.success) {
          message.success('PDF转OFD工具已启动');
        } else {
          Modal.error({
            title: 'PDF转OFD工具启动失败',
            content: (
              <>
                <p>{result.error || '未知错误'}</p>
                <Button 
                  type="primary" 
                  onClick={showLogViewer}
                  style={{ marginTop: '10px' }}
                >
                  查看详细日志
                </Button>
              </>
            ),
          });
          console.error('PDF转OFD工具启动详情:', result);
        }
        return;
      }
      
      // 如果没有上传文件，直接打开外部Java程序
      // Java程序会自己提供文件选择对话框
      const result = await window.electronAPI.launchExternalPdfApp({
        pdfPath: ''  // 空路径，让Java应用自己打开文件选择对话框
      });
      
      // 检查启动结果
      if (result.success) {
        message.success('PDF转OFD工具已启动');
      } else {
        Modal.error({
          title: 'PDF转OFD工具启动失败',
          content: (
            <>
              <p>{result.error || '未知错误'}</p>
              <Button 
                type="primary" 
                onClick={showLogViewer}
                style={{ marginTop: '10px' }}
              >
                查看详细日志
              </Button>
            </>
          ),
        });
        console.error('PDF转OFD工具启动详情:', result);
      }
      
    } catch (error: any) {
      console.error('启动外部PDF转OFD工具失败:', error);
      message.error('启动外部PDF转OFD工具失败: ' + (error.message || '未知错误'));
    }
  };
  
  // 显示日志查看器
  const showLogViewer = async () => {
    try {
      // 检查electronAPI是否可用
      if (!window.electronAPI) {
        message.error('Electron API不可用');
        return;
      }
      
      const logResult = await window.electronAPI.readLogFile();
      
      if (logResult.success) {
        Modal.info({
          title: '应用日志',
          width: 800,
          content: (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {logResult.content}
              </pre>
            </div>
          ),
          okText: '关闭'
        });
      } else {
        message.error('无法读取日志文件: ' + logResult.error);
      }
    } catch (error: any) {
      message.error('读取日志失败: ' + (error.message || '未知错误'));
    }
  };

  return (
    <div className="pdf-tools-container">
      {/* 返回按钮 */}
      <Button 
        type="link" 
        className="back-button"
        onClick={() => navigate(-1)}
        icon={<ArrowLeftOutlined />}
      >
        返回
      </Button>

      {/* 页面标题 */}
      <Title className="page-title">PDF格式转换</Title>
      <Text className="page-subtitle">将PDF文件转换为您需要的格式，或将其他文件转为PDF</Text>

      {/* 步骤指示器 */}
      <div className="steps-container">
        <Steps 
          current={currentStep} 
          className="custom-steps"
          onChange={setStep}
          items={[
            {
              title: "选择转换方向",
              icon: <div className="step-number">1</div>
            },
            {
              title: "选择目标格式",
              icon: <div className="step-number">2</div>
            },
            {
              title: "上传文件",
              icon: <div className="step-number">3</div>
            }
          ]}
        />
      </div>

      {/* 步骤1：转换方向选择 */}
      {currentStep === 0 && (
        <div className="conversion-direction">
          <Title level={4} className="section-title">请选择转换方向</Title>
          <div className="direction-buttons">
            <Card 
              className={`direction-card ${conversionDirection === 'pdfToOther' ? 'selected' : ''}`}
              onClick={() => {
                setConversionDirection('pdfToOther');
                nextStep();
              }}
            >
              <div className="direction-content">
                <div className="direction-icon">
                  <FileTextOutlined />
                </div>
                <div className="direction-title">PDF转其他格式</div>
                <div className="direction-desc">.pdf → 其他格式</div>
              </div>
            </Card>
            <Card
              className={`direction-card ${conversionDirection === 'otherToPdf' ? 'selected' : ''}`}
              onClick={() => {
                setConversionDirection('otherToPdf');
                nextStep();
              }}
            >
              <div className="direction-content">
                <div className="direction-icon">
                  <FileTextOutlined />
                </div>
                <div className="direction-title">其他格式转PDF</div>
                <div className="direction-desc">其他格式 → .pdf</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 步骤2：选择目标格式 */}
      {currentStep === 1 && (
        <div className="format-selection">
          <Title level={4} className="section-title">请选择目标格式</Title>
          <div className="format-grid">
            {conversionOptions.map(option => (
              <Card
                key={option.key}
                className={`format-card ${selectedFormat === option.key ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedFormat(option.key);
                  // 如果选择了OFD格式，则直接启动外部Java程序
                  if (option.key === 'ofd') {
                    handleOfdFormatSelection();
                  } else {
                    nextStep();
                  }
                }}
                bordered={false}
              >
                <div className="format-content">
                  <div className="icon-circle" style={{ backgroundColor: option.color }}>
                    {option.icon}
                  </div>
                  <div className="format-info">
                    <div className="format-title">{option.title}</div>
                    <div className="format-desc">{option.description}</div>
                  </div>
                  {selectedFormat === option.key && (
                    <div className="selected-indicator">
                      <CheckCircleOutlined />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 步骤3：上传区域 */}
      {currentStep === 2 && (
        <div className="upload-container">
          <Dragger
            multiple
            accept=".pdf"
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            className="upload-area"
            disabled={isProcessing || isCheckingInvoice}
          >
            <div className="upload-content">
              {isCheckingInvoice ? (
                <>
                  <Spin size="large" />
                  <p className="upload-text">正在分析文件...</p>
                </>
              ) : (
                <>
                  <div className="upload-icon-circle">
                    <UploadOutlined className="upload-icon" />
                  </div>
                  <p className="upload-text">拖放PDF文件到这里</p>
                  <p className="upload-hint">或</p>
                  <Button type="primary" size="large" className="select-file-btn">
                    选择文件
                  </Button>
                  <p className="file-limits">
                    {conversionDirection === 'pdfToOther' ? '支持PDF格式' : '支持DOC、DOCX、XLS、XLSX、PPT、PPTX、JPG、PNG等格式'}<br />
                    单个文件最大支持20MB
                  </p>
                </>
              )}
            </div>
          </Dragger>
        </div>
      )}

      {/* 文件列表 */}
      {processingFiles.length > 0 && (
        <div className="file-list">
          <Title level={5} className="file-list-title">已上传的文件</Title>
          {processingFiles.map(file => (
            <Card 
              key={file.uid} 
              className={`file-card ${file.status === 'success' ? 'success' : file.status === 'error' ? 'error' : ''}`}
              bordered={false}
            >
              <div className="file-info">
                <Text strong className="file-name">{file.name}</Text>
                <Text type="secondary" className="file-size">{formatFileSize(file.originalSize)}</Text>
                {file.status === 'success' && (
                  <div className="file-success">
                    <CheckCircleOutlined /> 转换成功
                  </div>
                )}
                {file.status === 'error' && (
                  <div className="file-error">
                    转换失败: {file.error}
                  </div>
                )}
              </div>
              <Space>
                <Button 
                  type="text" 
                  icon={<EyeOutlined />}
                  className="action-button"
                  onClick={() => handlePreviewFile(file.preview)}
                  title="预览"
                />
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />}
                  className="action-button"
                  onClick={() => handleDeleteFile(file.uid)}
                  title="删除"
                />
              </Space>
            </Card>
          ))}
        </div>
      )}

      {/* 转换按钮 */}
      {processingFiles.length > 0 && (
        <div className="button-container">
          <Button
            type="primary"
            size="large"
            block
            icon={<SaveOutlined />}
            onClick={handleBatchConvert}
            loading={isProcessing}
            className="convert-button"
          >
            开始转换
          </Button>
        </div>
      )}

      {/* 预览模态框 */}
      <Modal
        open={!!previewUrl}
        footer={null}
        onCancel={() => setPreviewUrl(null)}
        width={800}
        className="preview-modal"
      >
        {previewUrl && (
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '600px' }}
            title="PDF Preview"
          />
        )}
      </Modal>

      {/* OFD预览模态框 */}
      <OFDPreview
        visible={showOfdPreview}
        onClose={() => setShowOfdPreview(false)}
        onConvert={handleOfdConvert}
        pdfPreview={ofdPreviewState.pdfFile?.preview || null}
        pdfFileName={ofdPreviewState.pdfFile?.name || ''}
        isConverting={!!ofdPreviewState.isConverting}
        isInvoice={!!ofdPreviewState.isInvoice}
      />
    </div>
  );
};

export default PdfTools; 