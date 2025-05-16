import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Input, Radio, Slider, Button, message, Spin } from 'antd';
import { 
  ArrowLeftOutlined, 
  QrcodeOutlined, 
  DownloadOutlined,
  ScanOutlined,
  ClearOutlined 
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface QrCodeSettings {
  size: number;
  errorCorrectionLevel: 'L' | 'M' | 'H' | 'Q';
  foregroundColor: string;
  format: 'png' | 'svg' | 'text';
}

const QrCode: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'url' | 'text' | 'vcard'>('url');
  const [settings, setSettings] = useState<QrCodeSettings>({
    size: 500,
    errorCorrectionLevel: 'M',
    foregroundColor: '#000000',
    format: 'png'
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [textQRContent, setTextQRContent] = useState('');
  const [isTextFormat, setIsTextFormat] = useState(false);

  const handleGenerate = async () => {
    if (!content) {
      message.error('请输入内容');
      return;
    }

    setIsGenerating(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.generateQR({
          content,
          options: {
            ...settings,
            type: contentType
          }
        });

        if (result.success) {
          setPreviewUrl(result.dataUrl);
          
          // 处理文本格式
          if (result.isText && result.textContent) {
            setTextQRContent(result.textContent);
            setIsTextFormat(true);
          } else {
            setTextQRContent('');
            setIsTextFormat(false);
          }
          
          message.success('二维码生成成功！');
        } else {
          message.error('生成失败：' + result.error);
        }
      } else {
        message.error('无法访问Electron API');
      }
    } catch (error) {
      message.error('生成过程中发生错误');
      console.error('二维码生成错误:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!previewUrl) {
      message.error('请先生成二维码');
      return;
    }

    setIsDownloading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveQR({
          dataUrl: previewUrl,
          format: settings.format
        });
        
        if (result.success) {
          message.success('二维码已保存！');
        } else if (result.reason === 'canceled') {
          // 用户取消操作，不显示错误
        } else {
          message.error('保存失败：' + (result.error || '未知错误'));
        }
      } else {
        message.error('无法访问Electron API');
      }
    } catch (error) {
      message.error('下载过程中发生错误');
      console.error('二维码下载错误:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearContent = () => {
    setContent('');
    if (previewUrl) {
      setPreviewUrl('');
      setTextQRContent('');
      setIsTextFormat(false);
      message.success('内容已清除');
    }
  };

  const colorOptions = [
    { value: '#000000', label: '黑色' },
    { value: '#0071e3', label: '蓝色' },
    { value: '#fa3c52', label: '红色' },
    { value: '#38b6ff', label: '浅蓝' },
    { value: '#6a0dad', label: '紫色' }
  ];

  return (
    <div className="qrcode-container">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeftOutlined style={{ marginRight: 8 }} /> 返回
      </button>

      <h1 className="page-title">二维码生成</h1>

      <div className="page-actions">
        <Button 
          onClick={() => navigate('/qrcode/batch')} 
          type="default"
          icon={<ScanOutlined />}
          style={{ marginBottom: 20 }}
        >
          批量生成二维码
        </Button>
      </div>

      <div className="qrcode-content">
        {/* 左侧设置区域 */}
        <div className="qrcode-settings-panel">
          <div className="form-control">
            <label>内容</label>
            <TextArea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请输入内容，如网址、文本等"
              rows={4}
              style={{ borderRadius: 8, resize: 'none' }}
            />
          </div>

          <div className="form-control">
            <label>内容类型</label>
            <Radio.Group
              value={contentType}
              onChange={e => setContentType(e.target.value)}
              buttonStyle="solid"
              style={{ display: 'flex', gap: '10px' }}
            >
              <Radio.Button 
                value="url" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
              >
                URL
              </Radio.Button>
              <Radio.Button 
                value="text" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
              >
                文本
              </Radio.Button>
              <Radio.Button 
                value="vcard" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
              >
                vCard
              </Radio.Button>
            </Radio.Group>
          </div>

          <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 16, marginTop: 24 }}>
            设置
          </Text>

          <div className="form-control">
            <label>大小</label>
            <div className="slider-container">
              <Slider
                value={settings.size}
                min={100}
                max={1000}
                step={50}
                onChange={value => setSettings({ ...settings, size: value })}
                marks={{
                  100: '100px',
                  500: '500px',
                  1000: '1000px'
                }}
                trackStyle={{ backgroundColor: '#6a0dad' }}
                handleStyle={{ borderColor: '#6a0dad', backgroundColor: '#fff' }}
              />
              <span className="slider-value">{settings.size}px</span>
            </div>
          </div>

          <div className="form-control">
            <label>误差修正级别</label>
            <Radio.Group
              value={settings.errorCorrectionLevel}
              onChange={e => setSettings({ ...settings, errorCorrectionLevel: e.target.value })}
              buttonStyle="solid"
              style={{ display: 'flex', gap: '10px' }}
            >
              <Radio.Button 
                value="L" 
                style={{ 
                  borderRadius: '15px', 
                  height: '30px',
                  width: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                L
              </Radio.Button>
              <Radio.Button 
                value="M" 
                style={{ 
                  borderRadius: '15px', 
                  height: '30px',
                  width: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                M
              </Radio.Button>
              <Radio.Button 
                value="H" 
                style={{ 
                  borderRadius: '15px', 
                  height: '30px',
                  width: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                H
              </Radio.Button>
            </Radio.Group>
          </div>

          <div className="form-control">
            <label>前景色</label>
            <div className="color-options">
              {colorOptions.map(color => (
                <div
                  key={color.value}
                  className={`color-circle ${settings.foregroundColor === color.value ? 'selected' : ''}`}
                  style={{
                    backgroundColor: color.value
                  }}
                  onClick={() => setSettings({ ...settings, foregroundColor: color.value })}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            block
            className="primary-button"
            onClick={handleGenerate}
            loading={isGenerating}
            style={{ marginTop: 24 }}
            icon={<QrcodeOutlined />}
          >
            生成二维码
          </Button>
          
          <Button
            type="default"
            size="large"
            block
            onClick={handleClearContent}
            style={{ marginTop: 12 }}
            icon={<ClearOutlined />}
          >
            清除内容
          </Button>
        </div>

        {/* 右侧预览区域 */}
        <div className="qrcode-preview-panel">
          <div className="qrcode-preview-box">
            {isGenerating ? (
              <div className="qrcode-loading">
                <Spin size="large" />
                <p style={{ marginTop: 16, color: '#666' }}>生成中...</p>
              </div>
            ) : previewUrl ? (
              isTextFormat ? (
                <pre className="qrcode-text-preview">
                  {textQRContent}
                </pre>
              ) : (
                <img src={previewUrl} alt="QR Code" style={{ maxWidth: '100%', maxHeight: '100%' }} />
              )
            ) : (
              <div className="qrcode-placeholder">
                <QrcodeOutlined style={{ fontSize: 48, color: '#ddd' }} />
                <Text style={{ color: '#666', marginTop: 16 }}>预览区域</Text>
              </div>
            )}
          </div>

          <div className="qrcode-download-section">
            <Text strong style={{ fontSize: 18, marginBottom: 16, display: 'block' }}>下载选项</Text>
            
            <Radio.Group
              value={settings.format}
              onChange={e => setSettings({ ...settings, format: e.target.value })}
              buttonStyle="solid"
              style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: 16 }}
            >
              <Radio.Button 
                value="png" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
              >
                PNG
              </Radio.Button>
              <Radio.Button 
                value="svg" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
              >
                SVG
              </Radio.Button>
              <Radio.Button 
                value="text" 
                style={{ 
                  borderRadius: '18px', 
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px'
                }}
                title="ASCII文本格式，仅用于展示，不可直接扫描"
              >
                文本
              </Radio.Button>
            </Radio.Group>
            
            {settings.format === 'text' && (
              <Text type="warning" style={{ marginBottom: 16, display: 'block', fontSize: 12 }}>
                注意：文本格式是ASCII艺术字符，仅用于展示或分享文本，不可直接扫描。请使用PNG或SVG格式获取可扫描的二维码。
              </Text>
            )}

            <Button
              type="primary"
              size="large"
              block
              className="primary-button"
              disabled={!previewUrl || isGenerating}
              loading={isDownloading}
              onClick={handleDownload}
              icon={<DownloadOutlined />}
              style={{ 
                height: '40px', 
                borderRadius: '20px' 
              }}
            >
              下载二维码
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrCode; 