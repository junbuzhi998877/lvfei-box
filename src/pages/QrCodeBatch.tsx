import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Button, 
  Input, 
  Table, 
  message, 
  Upload, 
  Radio, 
  Popconfirm, 
  Space, 
  Spin, 
  Tooltip,
  Modal
} from 'antd';
import { 
  ArrowLeftOutlined, 
  UploadOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  CopyOutlined,
  FileExcelOutlined,
  ScanOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

// 生成一个唯一ID的简单函数
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

interface QrCodeItem {
  id: string;
  content: string;
  type: 'url' | 'text' | 'vcard';
  status: 'pending' | 'generated' | 'error';
  dataUrl?: string;
  error?: string;
}

const BatchQrCode: React.FC = () => {
  const navigate = useNavigate();
  const [qrItems, setQrItems] = useState<QrCodeItem[]>([]);
  const [contentType, setContentType] = useState<'url' | 'text' | 'vcard'>('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchFormat, setBatchFormat] = useState<'png' | 'svg'>('png');
  const [previewItem, setPreviewItem] = useState<QrCodeItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // 添加单个二维码项
  const addQrItem = () => {
    const newItem: QrCodeItem = {
      id: generateId(),
      content: '',
      type: contentType,
      status: 'pending'
    };
    setQrItems([...qrItems, newItem]);
  };

  // 移除二维码项
  const removeQrItem = (id: string) => {
    setQrItems(qrItems.filter(item => item.id !== id));
  };

  // 更新二维码项内容
  const updateQrItemContent = (id: string, content: string) => {
    setQrItems(qrItems.map(item => 
      item.id === id ? { ...item, content, status: 'pending' } : item
    ));
  };

  // 解析CSV/Excel数据为二维码项
  const parseFileData = (data: string) => {
    try {
      // 简单的CSV解析，按行分割
      const lines = data.split(/\r?\n/).filter(line => line.trim());
      
      const newItems: QrCodeItem[] = lines.map(line => ({
        id: generateId(),
        content: line.trim(),
        type: contentType,
        status: 'pending' as const
      }));
      
      if (newItems.length > 0) {
        setQrItems([...qrItems, ...newItems]);
        message.success(`成功导入${newItems.length}条数据`);
      } else {
        message.error('没有发现有效数据');
      }
    } catch (error) {
      message.error('解析文件失败');
      console.error('解析文件错误:', error);
    }
  };

  // 处理文件上传
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.txt,.csv',
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          parseFileData(e.target.result);
        }
      };
      reader.readAsText(file);
      
      // 返回false阻止上传
      return false;
    }
  };

  // 优化粘贴文本处理函数
  const handlePasteText = () => {
    Modal.confirm({
      title: '批量导入文本',
      width: 600,
      content: (
        <div>
          <p>每行一个内容，将自动生成对应的二维码。支持批量粘贴，最多支持1000行。</p>
          <TextArea
            rows={10}
            placeholder="请粘贴文本内容，每行将生成一个二维码
示例：
https://www.example1.com
https://www.example2.com
文本内容1
文本内容2"
            id="batchTextInput"
            style={{ marginTop: '10px' }}
          />
        </div>
      ),
      onOk() {
        const textInput = document.getElementById('batchTextInput') as HTMLTextAreaElement;
        if (textInput && textInput.value) {
          const lines = textInput.value
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (lines.length === 0) {
            message.error('没有检测到有效内容');
            return;
          }

          if (lines.length > 1000) {
            message.error('超出最大行数限制（1000行），请减少内容后重试');
            return;
          }

          // 检查是否有内容为URL，自动切换类型
          const hasUrls = lines.some(line => 
            line.startsWith('http://') || 
            line.startsWith('https://') || 
            line.startsWith('www.')
          );
          
          if (hasUrls && contentType !== 'url') {
            Modal.confirm({
              title: '检测到URL',
              content: '检测到内容中可能包含URL，是否自动切换到URL类型？',
              onOk() {
                setContentType('url');
                importLines(lines);
              },
              onCancel() {
                importLines(lines);
              }
            });
          } else {
            importLines(lines);
          }
        }
      },
      okText: '确认导入',
      cancelText: '取消',
    });
  };
  
  // 提取导入行的逻辑为单独函数
  const importLines = (lines: string[]) => {
    const newItems = lines.map(line => ({
      id: generateId(),
      content: line,
      type: contentType,
      status: 'pending' as const
    }));

    setQrItems(prevItems => [...prevItems, ...newItems]);
    message.success(`成功导入 ${newItems.length} 条数据`);
    
    // 自动滚动到表格底部
    setTimeout(() => {
      const tableBody = document.querySelector('.ant-table-body');
      if (tableBody) {
        tableBody.scrollTop = tableBody.scrollHeight;
      }
    }, 100);
  };

  // 添加批量生成处理函数
  const handleBatchGenerate = async () => {
    if (qrItems.length === 0) {
      message.error('请先添加二维码内容');
      return;
    }

    setIsGenerating(true);
    const total = qrItems.length;
    let success = 0;
    let failed = 0;

    try {
      const updatedItems = [...qrItems];
      
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.status === 'generated') continue;

        // 跳过空内容
        if (!item.content.trim()) {
          updatedItems[i] = {
            ...item,
            status: 'error',
            error: '内容不能为空'
          };
          failed++;
          continue;
        }

        try {
          if (window.electronAPI) {
            const result = await window.electronAPI.generateQR({
              content: item.content,
              options: {
                size: 300,
                errorCorrectionLevel: 'M',
                foregroundColor: '#000000',
                format: batchFormat,
                type: item.type
              }
            });

            if (result.success) {
              updatedItems[i] = {
                ...item,
                dataUrl: result.dataUrl,
                status: 'generated'
              };
              success++;
            } else {
              updatedItems[i] = {
                ...item,
                status: 'error',
                error: result.error || '生成失败'
              };
              failed++;
            }
          } else {
            throw new Error('Electron API不可用');
          }
        } catch (error) {
          updatedItems[i] = {
            ...item,
            status: 'error',
            error: error instanceof Error ? error.message : '处理过程中发生错误'
          };
          failed++;
        }

        // 更新进度
        setQrItems([...updatedItems]);
        
        // 每处理10个显示一次进度
        if ((i + 1) % 10 === 0 || i === updatedItems.length - 1) {
          message.info(`已处理 ${i + 1}/${total} 个二维码`);
        }
      }

      message.success(`批量生成完成！成功: ${success}个, 失败: ${failed}个`);
    } catch (error) {
      message.error('批量生成过程中发生错误');
      console.error('批量生成错误:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 批量下载二维码
  const downloadAllQRCodes = async () => {
    const generatedItems = qrItems.filter(item => item.status === 'generated');
    
    if (generatedItems.length === 0) {
      message.error('没有可下载的二维码，请先生成二维码');
      return;
    }
    
    setIsDownloading(true);
    
    try {
      if (window.electronAPI) {
        // 打开保存目录选择对话框
        const dirResult = await window.electronAPI.selectSavePath({});
        
        if (!dirResult.success || dirResult.reason === 'canceled') {
          setIsDownloading(false);
          return;
        }
        
        // 创建用于唯一文件名的时间戳
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // 准备二维码数据列表
        const qrList = generatedItems.map((item, index) => {
          // 创建更安全的文件名：移除所有非法字符，确保唯一性
          const safeContent = item.content
            .substring(0, 20)
            .replace(/[\\/:*?"<>|]/g, '_')  // 移除Windows文件系统禁止的字符
            .replace(/\s+/g, '_')           // 将空格替换为下划线
            .replace(/[^a-zA-Z0-9_\-.]/g, ''); // 只保留字母、数字、下划线、连字符和点
            
          // 添加索引和时间戳确保唯一性
          const fileName = `qrcode_${item.type}_${safeContent || index}_${index}_${timestamp}.${batchFormat}`;
          
          return {
            dataUrl: item.dataUrl,
            fileName: fileName,
            format: batchFormat,
            isText: false
          };
        });
        
        console.warn('准备保存的二维码列表:', qrList);
        
        // 调用批量保存API
        const result = await window.electronAPI.saveBatchQR({
          qrList: qrList,
          outputDir: dirResult.filePath
        });
        
        if (result.success) {
          message.success(`已保存${result.successCount}个二维码到: ${result.savedPath}`);
          
          if (result.failedCount > 0) {
            message.warning(`有${result.failedCount}个二维码保存失败，请检查日志`);
          }
        } else {
          message.error('保存失败: ' + (result.error || '未知错误'));
        }
      } else {
        message.error('无法访问Electron API');
      }
    } catch (error) {
      console.error('批量下载错误:', error);
      message.error('下载过程中发生错误: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsDownloading(false);
    }
  };

  // 清除所有内容
  const clearAllItems = () => {
    if (qrItems.length === 0) {
      message.info('当前没有二维码项');
      return;
    }
    
    Modal.confirm({
      title: '确认清除',
      content: '确定要清除所有二维码项吗？此操作不可撤销。',
      okText: '确认清除',
      cancelText: '取消',
      onOk() {
        setQrItems([]);
        message.success('已清除所有内容');
      }
    });
  };

  // 预览二维码
  const showQrPreview = (item: QrCodeItem) => {
    setPreviewItem(item);
    setShowPreview(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string, record: QrCodeItem) => (
        <Input 
          value={text} 
          onChange={(e) => updateQrItemContent(record.id, e.target.value)}
          placeholder="输入二维码内容"
          disabled={isGenerating}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          'url': 'URL',
          'text': '文本',
          'vcard': 'vCard'
        };
        return typeMap[type as keyof typeof typeMap] || type;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: QrCodeItem) => {
        if (status === 'generated') {
          return <Text type="success">已生成</Text>;
        } else if (status === 'error') {
          return <Tooltip title={record.error}><Text type="danger">失败</Text></Tooltip>;
        } else {
          return <Text type="warning">待生成</Text>;
        }
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: QrCodeItem) => (
        <Space size="small">
          {record.status === 'generated' && (
            <Button 
              type="link" 
              size="small"
              icon={<ScanOutlined />}
              onClick={() => showQrPreview(record)}
            >
              预览
            </Button>
          )}
          <Popconfirm
            title="确定要删除这项吗?"
            onConfirm={() => removeQrItem(record.id)}
          >
            <Button 
              type="link" 
              danger 
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="qrcode-batch-container">
      <button 
        className="back-button"
        onClick={() => navigate('/qrcode')}
      >
        <ArrowLeftOutlined style={{ marginRight: 8 }} /> 返回
      </button>

      <Title level={2} className="page-title">批量二维码生成</Title>

      <div className="batch-control-panel">
        <div className="batch-settings">
          <div className="form-control">
            <Text strong>内容类型</Text>
            <Radio.Group
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="text">文本</Radio.Button>
              <Radio.Button value="url">URL</Radio.Button>
              <Radio.Button value="vcard">vCard</Radio.Button>
            </Radio.Group>
          </div>

          <div className="form-control">
            <Text strong>输出格式</Text>
            <Radio.Group
              value={batchFormat}
              onChange={(e) => setBatchFormat(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="png">PNG</Radio.Button>
              <Radio.Button value="svg">SVG</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        <div className="batch-import-tools">
          <Space wrap>
            <Button 
              icon={<PlusOutlined />} 
              onClick={addQrItem}
              disabled={isGenerating}
            >
              添加项
            </Button>
            <Upload {...uploadProps}>
              <Button 
                icon={<FileExcelOutlined />} 
                disabled={isGenerating}
              >
                导入CSV
              </Button>
            </Upload>
            <Button 
              icon={<CopyOutlined />}
              onClick={handlePasteText}
              disabled={isGenerating}
              type="primary"
            >
              粘贴文本
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={clearAllItems}
              disabled={isGenerating || qrItems.length === 0}
              danger
            >
              清除所有
            </Button>
          </Space>
        </div>
      </div>

      <div className="batch-data-table">
        <Table 
          dataSource={qrItems} 
          columns={columns} 
          rowKey="id"
          pagination={false}
          scroll={{ y: 400 }}
          loading={isGenerating}
        />
      </div>

      <div className="batch-control-panel">
        <Space wrap>
          <Button 
            icon={<ScanOutlined />}
            onClick={handleBatchGenerate}
            loading={isGenerating}
            type="primary"
            disabled={qrItems.length === 0}
          >
            生成全部二维码
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadAllQRCodes}
            loading={isDownloading}
            disabled={qrItems.filter(item => item.status === 'generated').length === 0}
          >
            下载全部二维码
          </Button>
        </Space>
      </div>

      {/* 二维码预览模态框 */}
      <Modal
        title="二维码预览"
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={null}
        width={400}
      >
        {previewItem && previewItem.dataUrl && (
          <div className="qr-preview-modal">
            <img 
              src={previewItem.dataUrl} 
              alt="QR Code Preview" 
              style={{ maxWidth: '100%' }} 
            />
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Text strong>内容:</Text> {previewItem.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BatchQrCode; 