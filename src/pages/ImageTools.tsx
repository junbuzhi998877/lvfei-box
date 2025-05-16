import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Upload, 
  Button, 
  Slider, 
  Radio, 
  message, 
  Space,
  Card
} from 'antd';
import { 
  UploadOutlined, 
  ArrowLeftOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  FileImageOutlined,
  PictureOutlined
} from '@ant-design/icons';
import '../styles/ImageTools.css';

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

interface ImageSettings {
  quality: number;
  maxWidth: number;
  format: 'jpg' | 'png' | 'webp' | 'avif';
}

interface ProcessingFile {
  uid: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  originalSize?: number;
  processedSize?: number;
  error?: string;
  preview?: string;
  originFileObj?: File;
  path?: string;
  processedPath?: string;
  compressionRatio?: string;
  originalDimensions?: string;
  compressedDimensions?: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: {
      getAppInfo: () => Promise<any>;
      convertPDF: (options: any) => Promise<any>;
      compressImage: (options: any) => Promise<any>;
      generateQR: (options: any) => Promise<any>;
      saveQR: (options: any) => Promise<any>;
      saveBatchQR: (options: any) => Promise<any>;
      processImage: (options: any) => Promise<any>;
      uploadImage: (options: any) => Promise<any>;
      selectSavePath: (options: any) => Promise<any>;
      saveBatchImages: (options: any) => Promise<any>;
    };
  }
}

const ImageTools: React.FC = () => {
  const navigate = useNavigate();
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [settings, setSettings] = useState<ImageSettings>({
    quality: 85,
    maxWidth: 1920,
    format: 'jpg'
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionMode, setCompressionMode] = useState<'highQuality' | 'balanced' | 'maximum' | 'custom'>('highQuality');

  // 处理文件上传前的预览
  const handleBeforeUpload = async (file: File) => {
    console.log('上传文件:', file);
    
    // 检查文件大小
    if (file.size > 20 * 1024 * 1024) {
      message.error(`${file.name} 超过20MB限制`);
      return false;
    }

    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(`${file.name} 不是有效的图片文件`);
      return false;
    }

    try {
      // 创建文件预览
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const dataUrl = await dataUrlPromise;
      
      // 获取图片尺寸
      const dimensions = await getImageDimensions(dataUrl);
      const dimensionsStr = dimensions ? `${dimensions.width} × ${dimensions.height} px` : undefined;

      // 先添加到文件列表，显示预览
      const newFile: ProcessingFile = {
        uid: file.name + Date.now(),
        name: file.name,
        status: 'pending',
        progress: 0,
        originalSize: file.size,
        preview: dataUrl,
        originFileObj: file,
        originalDimensions: dimensionsStr
      };
      
      setProcessingFiles(prev => [...prev, newFile]);

      // 使用 uploadImage API 上传文件
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.uploadImage({
            dataUrl: dataUrl,
            fileName: file.name
          });

          if (result.success) {
            // 更新文件状态，添加服务器路径
            setProcessingFiles(prev => 
              prev.map(f => 
                f.uid === newFile.uid 
                  ? {...f, path: result.filePath}
                  : f
              )
            );
            message.success(`${file.name} 上传成功`);
          } else {
            message.error(`${file.name} 上传失败: ${result.error}`);
            // 从列表中移除上传失败的文件
            setProcessingFiles(prev => prev.filter(f => f.uid !== newFile.uid));
          }
        } catch (error: any) {
          message.error(`上传文件时出错: ${error.message || '未知错误'}`);
          // 从列表中移除上传失败的文件
          setProcessingFiles(prev => prev.filter(f => f.uid !== newFile.uid));
        }
      } else {
        message.error('系统功能不可用，请重启应用');
      }
    } catch (error: any) {
      message.error(`${file.name} 处理失败: ${error.message || '未知错误'}`);
    }

    return false;
  };

  // 获取图片尺寸
  const getImageDimensions = (dataUrl: string): Promise<{width: number, height: number} | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = dataUrl;
    });
  };

  // 处理图片
  const processImage = async (file: ProcessingFile) => {
    const fileIndex = processingFiles.findIndex(f => f.uid === file.uid);
    if (fileIndex === -1) return;

    try {
      // 更新状态为处理中
      setProcessingFiles(prev => {
        const updated = [...prev];
        updated[fileIndex] = { ...updated[fileIndex], status: 'processing', progress: 10 };
        return updated;
      });

      if (window.electronAPI) {
        // 准备输出文件名
        const fileExt = settings.format;
        const originalName = file.name.split('.').slice(0, -1).join('.');
        const outputFileName = `${originalName}_压缩.${fileExt}`;

        const result = await window.electronAPI.processImage({
          inputData: file.preview,
          fileName: outputFileName,
          options: {
            quality: settings.quality,
            format: settings.format,
            maxWidth: settings.maxWidth
          }
        });

        if (result.success) {
          // 获取压缩后图片尺寸
          const compressedDimensions = await getImageDimensions(result.data);
          const compressedDimensionsStr = compressedDimensions 
            ? `${compressedDimensions.width} × ${compressedDimensions.height} px` 
            : undefined;

          // 计算压缩比例
          const compressionRatio = file.originalSize && result.size
            ? ((file.originalSize - result.size) / file.originalSize * 100).toFixed(0) + '%'
            : undefined;

          // 更新文件状态，包括压缩信息
          setProcessingFiles(prev => {
            const updated = [...prev];
            updated[fileIndex] = {
              ...updated[fileIndex],
              status: 'success',
              progress: 100,
              processedSize: result.size,
              processedPath: result.tempPath,
              preview: result.data,
              compressionRatio,
              compressedDimensions: compressedDimensionsStr
            };
            return updated;
          });
          
          message.success(`${file.name} 处理成功`);
        } else {
          throw new Error(result.error || '处理失败');
        }
      }
    } catch (error: any) {
      setProcessingFiles(prev => {
        const updated = [...prev];
        updated[fileIndex] = {
          ...updated[fileIndex],
          status: 'error',
          progress: 0,
          error: error.message || '处理失败'
        };
        return updated;
      });
      message.error(`处理失败: ${error.message || '未知错误'}`);
    }
  };

  // 批量处理图片
  const handleBatchProcess = async () => {
    if (processingFiles.length === 0) {
      message.warning('请先添加图片');
      return;
    }

    const pendingFiles = processingFiles.filter(file => file.status !== 'success' && file.status !== 'processing');
    
    if (pendingFiles.length === 0) {
      message.info('没有需要处理的文件');
      return;
    }

    setIsProcessing(true);

    try {
      // 先处理所有图片
      for (const file of pendingFiles) {
        await processImage(file);
        // 添加短暂延迟，避免UI卡顿
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 获取所有处理成功的文件
      const currentFiles = await new Promise<ProcessingFile[]>(resolve => {
        setProcessingFiles(prev => {
          resolve(prev);
          return prev;
        });
      });
      
      const successFiles = currentFiles.filter(file => file.status === 'success');
      
      if (successFiles.length > 0) {
        // 选择保存目录
        if (window.electronAPI) {
          const savePathResult = await window.electronAPI.selectSavePath({
            defaultName: '选择保存目录'
          });

          if (savePathResult?.success) {
            // 批量保存所有处理好的图片
            const saveResult = await window.electronAPI.saveBatchImages({
              files: successFiles.map(file => ({
                tempPath: file.processedPath,
                fileName: `${file.name.split('.').slice(0, -1).join('.')}_压缩.${settings.format}`
              })),
              outputDir: savePathResult.filePath
            });

            if (saveResult?.success) {
              message.success('所有文件保存成功！');
              // 清空处理文件列表，这样上传区域就不会显示文件了
              setProcessingFiles([]);
            } else {
              throw new Error(saveResult?.error || '保存文件失败');
            }
          }
        } else {
          throw new Error('系统功能不可用，请重启应用');
        }
      } else {
        message.warning('没有处理成功的文件需要保存');
      }
      
      message.success('所有文件处理完成！');
    } catch (error: any) {
      message.error(`批量处理过程中发生错误: ${error.message || '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 移除文件
  const handleRemoveFile = (uid: string) => {
    setProcessingFiles(prev => prev.filter(file => file.uid !== uid));
  };

  // 预览图片
  const handlePreview = (preview: string) => {
    setPreviewImage(preview);
  };

  // 添加文件大小格式化函数
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

  // 设置压缩模式
  const handleCompressionModeChange = (mode: 'highQuality' | 'balanced' | 'maximum' | 'custom') => {
    setCompressionMode(mode);
    switch(mode) {
      case 'highQuality':
        setSettings({...settings, quality: 90});
        break;
      case 'balanced':
        setSettings({...settings, quality: 75});
        break;
      case 'maximum':
        setSettings({...settings, quality: 50});
        break;
      default:
        // 保持当前设置
        break;
    }
  };

  // 清除所有图片
  const handleClearAllImages = () => {
    setProcessingFiles([]);
    message.success('已清除所有图片');
  };

  // 显示已有图片数量
  const fileCount = processingFiles.length;
  
  return (
    <div className="image-tools-container">
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
      <Title className="page-title">图片压缩工具</Title>
      <Text className="page-subtitle">优化图片尺寸，减小文件体积，保持清晰度</Text>

      {/* 主内容区 */}
      <Card className="main-content-card">
        {/* 上传区域 */}
        <div className="upload-container">
          <Dragger
            multiple
            accept=".jpg,.jpeg,.png,.webp,.heic"
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            className="upload-area"
            disabled={isProcessing}
          >
            <div className="upload-content">
              {processingFiles.length > 0 && !processingFiles.every(file => file.status === 'success') ? (
                <div className="thumbnail-preview">
                  {processingFiles.map((file, index) => (
                    index < 3 && file.status !== 'success' && (
                      <div key={file.uid} className="thumbnail-item">
                        <img src={file.preview} alt={file.name} />
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <>
                  <div className="preset-thumbnails">
                    <div className="preset-thumbnail blue">
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', background: 'linear-gradient(to top, white 0%, rgba(255,255,255,0) 100%)' }}></div>
                      </div>
                    </div>
                    <div className="preset-thumbnail pink">
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', background: 'linear-gradient(to top, white 0%, rgba(255,255,255,0) 100%)' }}></div>
                      </div>
                    </div>
                    <div className="preset-thumbnail green">
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '10px', top: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'white' }}></div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40%', background: 'linear-gradient(to top, white 0%, rgba(255,255,255,0) 100%)' }}></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              <p className="upload-text">拖放图片到这里上传</p>
              <p className="upload-hint">支持JPG、PNG、WEBP、HEIC等多种格式</p>
              <Button type="primary" className="select-file-btn">
                选择文件
              </Button>
            </div>
          </Dragger>
          {fileCount > 0 && processingFiles.some(file => file.status !== 'success') && (
            <div className="files-count">
              已选择{processingFiles.filter(file => file.status !== 'success').length}张图片
              <span className="count-badge">{processingFiles.filter(file => file.status !== 'success').length}</span>
            </div>
          )}
        </div>

        {/* 压缩选项 */}
        <div className="compress-options">
          <Title level={5} className="section-title">压缩选项</Title>

          <div className="option-buttons">
            <div className={`option-button ${compressionMode === 'highQuality' ? 'active' : ''}`} 
                 onClick={() => handleCompressionModeChange('highQuality')}>
              <span>保持高画质</span>
            </div>
            <div className={`option-button ${compressionMode === 'balanced' ? 'active' : ''}`}
                 onClick={() => handleCompressionModeChange('balanced')}>
              <span>平衡模式</span>
            </div>
            <div className={`option-button ${compressionMode === 'maximum' ? 'active' : ''}`}
                 onClick={() => handleCompressionModeChange('maximum')}>
              <span>最大压缩</span>
            </div>
            <div className={`option-button ${compressionMode === 'custom' ? 'active' : ''}`}
                 onClick={() => handleCompressionModeChange('custom')}>
              <span>自定义设置</span>
            </div>
          </div>

          {/* 自定义设置区域 */}
          <div className="custom-settings">
            <div className="setting-item">
              <div className="setting-label">
                <span>质量</span>
                <span className="setting-value">{settings.quality}%</span>
              </div>
              <div className="slider-container">
                <div className="progress-bg"></div>
                <div className="progress-fill" style={{ width: `${settings.quality / 100 * 520}px` }}></div>
                <Slider
                  value={settings.quality}
                  onChange={value => setSettings({ ...settings, quality: value })}
                  min={0}
                  max={100}
                  className="custom-slider"
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>最大宽度</span>
                <span className="setting-value">{settings.maxWidth}px</span>
              </div>
              <div className="slider-container">
                <div className="progress-bg"></div>
                <div className="progress-fill" style={{ width: `${(settings.maxWidth / 3840) * 520}px` }}></div>
                <Slider
                  value={settings.maxWidth}
                  onChange={value => setSettings({ ...settings, maxWidth: value })}
                  min={800}
                  max={3840}
                  className="custom-slider"
                />
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>输出格式</span>
              </div>
              <div className="format-buttons">
                <div 
                  className={`format-button ${settings.format === 'jpg' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, format: 'jpg'})}
                >
                  JPG
                </div>
                <div 
                  className={`format-button ${settings.format === 'png' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, format: 'png'})}
                >
                  PNG
                </div>
                <div 
                  className={`format-button ${settings.format === 'webp' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, format: 'webp'})}
                >
                  WEBP
                </div>
                <div 
                  className={`format-button ${settings.format === 'avif' ? 'active' : ''}`}
                  onClick={() => setSettings({...settings, format: 'avif'})}
                >
                  AVIF
                </div>
              </div>
            </div>
          </div>

          {/* 预览区域 */}
          {processingFiles.length > 0 && (
            <div className="preview-container">
              <div className="preview-section original">
                <h3 className="preview-title">原图</h3>
                <p className="preview-filename">{processingFiles[0].name}</p>
                <p className="preview-size">{formatFileSize(processingFiles[0].originalSize)}</p>
                <p className="preview-dimensions">{processingFiles[0].originalDimensions}</p>
              </div>

              <div className="preview-divider"></div>

              <div className="preview-section compressed">
                <h3 className="preview-title">压缩后</h3>
                <p className="preview-filename">
                  {processingFiles[0].name.split('.').slice(0, -1).join('.')}_压缩.{settings.format}
                </p>
                <p className="preview-size compressed-size">
                  {processingFiles[0].processedSize ? formatFileSize(processingFiles[0].processedSize) : processingFiles[0].originalSize ? "预计 " + formatFileSize(processingFiles[0].originalSize * 0.3) : "正在计算..."}
                </p>
                <p className="preview-dimensions">{processingFiles[0].compressedDimensions || processingFiles[0].originalDimensions}</p>
                
                {processingFiles[0].compressionRatio && (
                  <div className="saving-badge">
                    节省 {processingFiles[0].compressionRatio}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 底部操作按钮 */}
          <div className="action-buttons">
            <Button className="add-more-button" onClick={handleClearAllImages}>
              添加更多图片
            </Button>
            <Button 
              type="primary" 
              className="process-button"
              onClick={handleBatchProcess}
              loading={isProcessing}
              disabled={processingFiles.length === 0}
            >
              下载压缩后的图片
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImageTools; 