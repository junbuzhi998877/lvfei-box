const { contextBridge, ipcRenderer } = require('electron');

// 安全设置
const validChannels = [
  'get-app-info',
  'upload-image',
  'convert-pdf',
  'convert-pdf-batch',
  'convert-pdf-batch-to-ofd', // 新增批量OFD转换通道
  'compress-image',
  'process-image',
  'generate-qr',
  'select-save-path',
  'save-batch-images',
  'save-batch-qr', // 新增批量保存二维码通道
  'save-qr', // 新增单个保存二维码通道
  'check-java-environment', // 新增Java环境检查通道
  'detect-invoice', // 新增发票检测通道
  'delete-file', // 新增删除文件通道
  'menu-action', // 新增菜单操作通道
  'file-opened', // 新增文件打开通道
  'launch-external-pdf-app' // 新增启动外部PDF应用通道
];

// API暴露
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // PDF转换
  convertPDF: (options) => ipcRenderer.invoke('convert-pdf', options),
  
  // 批量PDF转换
  convertPDFBatch: (options) => ipcRenderer.invoke('convert-pdf-batch', options),
  
  // 批量PDF转OFD
  convertPDFBatchToOFD: (options) => ipcRenderer.invoke('convert-pdf-batch-to-ofd', options),
  
  // 图片压缩
  compressImage: (options) => ipcRenderer.invoke('compress-image', options),
  
  // 图片处理
  processImage: (options) => ipcRenderer.invoke('process-image', options),
  
  // 二维码生成
  generateQR: (options) => ipcRenderer.invoke('generate-qr', options),
  
  // 单个保存二维码
  saveQR: (options) => ipcRenderer.invoke('save-qr', options),
  
  // 批量保存二维码
  saveBatchQR: (options) => ipcRenderer.invoke('save-batch-qr', options),
  
  // 选择保存路径
  selectSavePath: (options) => ipcRenderer.invoke('select-save-path', options),
  
  // 批量保存图片
  saveBatchImages: (options) => ipcRenderer.invoke('save-batch-images', options),
  
  // 检查Java环境
  checkJavaEnvironment: () => ipcRenderer.invoke('check-java-environment'),
  
  // 检测PDF是否为发票
  detectInvoice: (options) => ipcRenderer.invoke('detect-invoice', options),
  
  // 上传图片
  uploadImage: (options) => ipcRenderer.invoke('upload-image', options),
  
  // 删除文件
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  
  // 菜单事件监听
  onMenuAction: (callback) => {
    const listener = (event, action) => callback(action);
    ipcRenderer.on('menu-action', listener);
    return () => ipcRenderer.removeListener('menu-action', listener);
  },
  
  // 文件打开事件监听
  onFileOpened: (callback) => {
    const listener = (event, fileInfo) => callback(fileInfo);
    ipcRenderer.on('file-opened', listener);
    return () => ipcRenderer.removeListener('file-opened', listener);
  },
  
  // 启动外部PDF转OFD应用
  launchExternalPdfApp: (options) => ipcRenderer.invoke('launch-external-pdf-app', options),
  readLogFile: () => ipcRenderer.invoke('read-log-file')
});
