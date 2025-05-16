# 旅飞小熊工具箱

一个基于Electron的多功能办公工具箱应用，提供PDF格式转换、图片处理、二维码生成等实用功能。

## 功能概述

- **PDF转OFD**：将PDF文件转换为符合国家标准的OFD格式
- **图片处理**：压缩、格式转换等
- **二维码生成**：快速创建和保存二维码

## 安装说明

1. 下载最新发布版本
2. 运行安装程序，按照向导完成安装
3. 启动应用程序

## 系统要求

- Windows 10/11, macOS 10.15+, 或 Linux
- 4GB RAM (推荐8GB)
- 500MB可用磁盘空间
- 应用包含内置JRE，无需安装额外Java环境

## 功能详情

### 1. PDF转OFD功能

#### 基本介绍
支持将PDF文档转换为OFD（开放版式文档）格式，符合中国《GB/T 33190-2016 电子文件存储与交换格式版式文档》国家标准。

#### 核心特性
- **双引擎支持**：
  - 优先使用外部Java转换引擎（更高质量，完整保留格式）
  - 备用内置转换引擎（确保转换成功）
- **无缝集成**：通过Electron与外部Java程序通信，实现无缝的用户体验
- **智能文件选择**：如已上传文件则直接处理，否则提供文件选择对话框
- **支持文本、图片等元素保留**
- **自定义一致性级别选项**：basic/standard/enhanced
- **支持保留数字签名**（可选）
- **转换进度实时显示**
- **转换参数可配置**

#### 发票专用功能
- **智能发票识别**：自动分析PDF文件内容，识别是否为发票
- **发票关键信息提取**：自动识别发票号码、税率、价税合计等关键信息
- **多种发票格式支持**：支持增值税普通发票、增值税专用发票、电子发票等格式
- **文本精准布局**：保持原始发票的文本布局和位置
- **模板化处理**：针对常见发票格式使用专门的处理模板

#### 注意事项
- **文件兼容性**：生成的OFD文件适配主流OFD阅读器（如福昕OFD阅读器、WPS等）
- **临时文件**：转换过程中会在系统临时目录创建文件，转换完成后会自动清理
- **转换速度**：常规发票转换通常在1秒内完成
- **批量转换**：支持多个PDF文件批量转OFD，自动并发处理

#### 故障排除
如果转换后的OFD文件无法正常打开或显示空白，请尝试以下步骤：
1. 确认源PDF文件可以正常打开
2. 检查转换日志中是否有错误提示
3. 尝试不同的转换参数设置，特别是针对发票类型
4. 使用最新版本的OFD阅读器打开（推荐使用福昕OFD阅读器或WPS Office）
5. 对于特殊格式发票，可尝试手动选择"发票专用处理模式"

#### Java环境问题修复
如果遇到Java环境相关问题，例如"Java环境不可用"或"类版本不兼容"（UnsupportedClassVersionError），请按照以下步骤操作：
1. 完全退出应用程序
2. 删除应用程序安装目录下的`jre`文件夹（如果存在）
3. 重新启动应用程序，系统将自动下载并配置正确版本的JRE

### 2. 图片处理功能

#### 支持的图片格式
- **JPG/JPEG**：最常见的图片格式，适合照片压缩
- **PNG**：支持透明背景，适合图标和界面元素
- **WebP**：Google开发的高效图片格式，提供更好的压缩率

#### 功能特点
- **质量调整**：可设置1-100的压缩质量
- **尺寸调整**：可保持原始尺寸或自定义新尺寸
- **批处理**：支持一次处理多张图片
- **保持原始尺寸选项**
- **智能压缩算法**
- **支持拖拽上传**
- **实时压缩预览**
- **自动清理临时文件**
- **显示压缩比例和文件大小信息**
- **自定义输出目录**

#### WebP图片处理增强功能
- WebP图片的加载和预览
- WebP转JPG/PNG格式
- 调整WebP图片的质量和大小
- 批量处理WebP图片
- WebP图片的无损压缩处理
- 支持高质量的WebP转换，保留透明度信息
- 添加WebP格式的预览缩略图生成
- 提供多种WebP图片编码选项（有损/无损）

#### 使用建议
- WebP格式适合网页图片，压缩率高但兼容性相对较低
- 对于需要高质量的照片，建议使用JPG格式，质量设置在80-90
- 对于需要透明背景的图片，使用PNG格式
- 批量处理大量图片时，先进行少量测试确认效果

### 3. 二维码功能

#### 支持的二维码类型
- 普通文本
- 网址链接
- 电话号码
- 电子邮件
- 短信
- Wifi配置
- 地理位置
- 联系人信息

#### 功能特点
- **清除按钮**：单个和批量生成页面均支持清除功能
- **批量生成和保存**：支持一次性生成多个二维码
- **文件保存优化**：解决批量保存时文件名重复问题
- **智能命名系统**：自动检测重复文件名
- **自定义设置**：
  - 可调整大小和颜色
  - 多级容错率
  - 导出PNG/SVG格式
  - 支持ASCII文本格式导出
- **实时预览**

## API接口

### 前端API

#### PDF转换接口
```typescript
// IPC通道: 'convert-pdf'
interface ConvertPdfParams {
  inputPath: string;
  outputPath: string;
  type: 'docx' | 'xlsx' | 'pptx' | 'jpg' | 'png' | 'ofd';
  options?: {
    // 通用选项
    pageRange?: string;     // 页面范围，例如: "1-3,5,7-9"
    password?: string;      // PDF密码（如果有）
    quality?: number;       // 输出质量 (1-100，用于图片输出)
    dpi?: number;          // 输出DPI (用于图片输出)
    
    // Word转换选项
    preserveImages?: boolean;       // 是否保留图片
    preserveFormatting?: boolean;   // 是否保留格式
    
    // Excel转换选项
    detectTables?: boolean;         // 是否自动检测表格
    preserveLinks?: boolean;        // 是否保留链接
    
    // PPT转换选项
    preserveAnimations?: boolean;   // 是否保留动画
    slidePerPage?: boolean;         // 每页生成一张幻灯片
    
    // OFD转换选项
    preserveSignatures?: boolean;   // 是否保留签名
    conformance?: 'basic' | 'standard' | 'enhanced';  // OFD一致性级别
  }
}

interface ConvertPdfResult {
  success: boolean;
  error?: string;
  outputPath?: string;
  pageCount?: number;
  conversionTime?: number;  // 转换耗时（毫秒）
  fileSize?: number;        // 输出文件大小（字节）
}

// IPC通道: 'convert-pdf-batch'
interface ConvertPdfBatchParams {
  files: Array<{
    inputPath: string;
    outputPath: string;
    type: 'docx' | 'xlsx' | 'pptx' | 'jpg' | 'png' | 'ofd';
    options?: ConvertPdfParams['options'];
  }>;
}

interface ConvertPdfBatchResult {
  success: boolean;
  results: Array<{
    inputPath: string;
    outputPath: string;
    success: boolean;
    error?: string;
  }>;
  totalTime: number;      // 总转换时间（毫秒）
  failedCount: number;    // 失败文件数
  successCount: number;   // 成功文件数
}
```

#### 图片处理接口
```typescript
// IPC通道: 'compress-image'
interface CompressImageParams {
  inputPath: string;
  outputPath: string;
  options: {
    quality: number;        // 压缩质量 (1-100)
    format: 'jpg' | 'png' | 'webp';  // 输出格式
    keepOriginalSize: boolean;  // 是否保持原始尺寸
    width?: number;        // 可选的输出宽度
    height?: number;       // 可选的输出高度
    maintainAspectRatio?: boolean;  // 是否保持宽高比
  }
}

interface CompressImageResult {
  success: boolean;
  error?: string;
  originalSize?: number;    // 原始文件大小（字节）
  compressedSize?: number;  // 压缩后文件大小（字节）
  compressionRatio?: string; // 压缩率（百分比）
}

// IPC通道: 'process-image'
interface ProcessImageParams {
  inputData: string;  // Base64格式的图片数据
  fileName: string;
  options: {
    operation: 'compress';
    quality: number;
    keepOriginalSize: boolean;
    width?: number;
    height?: number;
  }
}

// IPC通道: 'save-batch-images'
interface SaveBatchImagesParams {
  files: Array<{
    tempPath: string;
    fileName: string;
  }>;
  outputDir: string;
}
```

#### 二维码生成接口
```typescript
// IPC通道: 'generate-qr'
interface GenerateQrParams {
  content: string;
  options: {
    size: number;
    errorCorrectionLevel: 'L' | 'M' | 'H' | 'Q';
    foregroundColor: string;
    type: 'url' | 'text' | 'vcard';
    format: 'png' | 'svg' | 'text';
  }
}

interface GenerateQrResult {
  success: boolean;
  dataUrl?: string;
  textContent?: string;
  isText?: boolean;
  error?: string;
}

// IPC通道: 'save-qr'
interface SaveQrParams {
  dataUrl: string;         // 二维码的Data URL (base64格式)
  fileName?: string;       // 可选的文件名
  format: 'png' | 'svg';   // 文件格式
  isText?: boolean;        // 是否为文本格式二维码
  textContent?: string;    // 文本格式二维码内容
}

interface SaveQrResult {
  success: boolean;
  savedPath?: string;     // 保存的文件路径
  error?: string;
  canceled?: boolean;     // 用户是否取消了保存操作
}

// IPC通道: 'save-batch-qr'
interface SaveBatchQrParams {
  qrList: Array<{
    dataUrl: string;
    fileName: string;
    format: 'png' | 'svg';
    isText?: boolean;
    textContent?: string;
  }>;
  outputDir: string;
}

interface SaveBatchQrResult {
  success: boolean;
  results: Array<{
    success: boolean;
    path?: string;
    fileName: string;
    error?: string;
  }>;
  savedPath?: string;
  successCount: number;
  failedCount: number;
  error?: string;
}
```

### Electron API函数

- `electronAPI.convertPDF`: 转换单个PDF文件
- `electronAPI.convertPDFBatch`: 批量转换PDF文件
- `electronAPI.launchExternalPdfApp`: 使用外部程序打开PDF文件
- `electronAPI.checkJavaEnvironment`: 检查Java环境是否可用
- `electronAPI.compressImage`: 压缩图片
- `electronAPI.processImage`: 处理图片（调整尺寸、质量、格式）
- `electronAPI.generateQR`: 生成二维码
- `electronAPI.saveQR`: 保存二维码到文件
- `electronAPI.saveBatchQR`: 批量保存二维码
- `electronAPI.selectSavePath`: 选择保存路径

### 后端API

- `pdfHandlers.js`: 处理PDF转换相关操作
- `imageHandlers.js`: 处理图片相关操作
- `qrHandlers.js`: 处理二维码相关操作
- `/api/pdf2ofd`: 将PDF转换为OFD
- `/api/batch-convert`: 批量转换文件

## 技术信息

### 技术栈
- Electron v24.x
- React v18.x
- TypeScript v4.x
- Jimp (图片处理)
- QRCode (二维码生成)
- Ant Design v5.x (UI组件库)

### 主要依赖包版本
```json
{
  "electron": "^24.0.0",
  "react": "^18.2.0",
  "typescript": "^4.9.0",
  "jimp": "^0.22.10",
  "qrcode": "^1.5.3",
  "antd": "^5.0.0",
  "pdf-lib": "^1.17.1",
  "node-ofd": "^1.0.0",      // OFD转换支持
  "pdf2json": "^2.0.1",      // PDF解析
  "docx": "^7.8.0",         // Word文档生成
  "exceljs": "^4.3.0",      // Excel文档生成
  "pptxgenjs": "^3.12.0"    // PPT文档生成
}
```

### 开发环境要求
- Node.js >= 16.x
- npm >= 8.x
- Windows 10/11 或 macOS 10.15+

### 项目结构
```
toolbox-app/
├── src/
│   ├── main.tsx          # React入口文件
│   ├── App.tsx           # 主应用组件
│   ├── pages/           # 页面组件
│   │   ├── Home.tsx
│   │   ├── PdfTools.tsx
│   │   ├── ImageTools.tsx
│   │   ├── QrCode.tsx
│   │   └── Support.tsx
│   └── styles/          # 样式文件
│       ├── index.css
│       └── App.css
├── main.js              # Electron主进程
├── index.html          # HTML入口文件
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript配置
└── vite.config.ts      # Vite配置
```

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 打包发布

```bash
# 构建生产版本
npm run build

# 打包应用
npm run package
```

## 注意事项

1. PDF转换功能需要确保系统已安装相应的字体
2. 图片压缩功能对于大尺寸图片可能需要较长处理时间
3. 二维码生成时，建议使用适当的容错级别以确保扫描成功率
4. WebP格式的图片处理可能需要额外的处理时间
5. 批量处理大量图片时，建议预留足够的系统资源
6. 临时文件会在处理完成后自动清理
7. PDF转OFD功能需要额外的系统资源，建议限制并发转换数量
8. 某些加密的PDF文件可能需要密码才能进行转换
9. 转换大型PDF文件时，建议先进行文件完整性检查

## 更新日志

### 2025-05-15

- 应用正式更名为"旅飞小熊工具箱"
- 升级内置JRE到版本17.0.15，支持Java 14+编译的应用
- 全面优化WebP图片处理功能：
  - 改进子进程调用方式，避免参数传递错误
  - 添加多线程支持，提高转换速度
  - 实现多级容错处理，增强应用稳定性
  - 改进错误提示和用户界面反馈
- 优化内存使用和应用启动速度
- 改进错误处理和用户反馈

### 2025-05-01

- 添加批量PDF转OFD功能
- 优化图片处理算法
- 修复部分UI显示问题
- 改进应用响应性

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 开发者联系

- 联系邮箱：support@example.com 

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件 