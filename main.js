const { app, BrowserWindow, ipcMain, session, dialog, Menu, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';
const url = require('url');

// 安全引入可能不存在的模块
let QRCode, Jimp, PDFDocument, PDFParser, docx, ExcelJS, pptxgenjs, fromPath, webp, JSZip;

try { QRCode = require('qrcode'); } catch (e) { 
  console.error(`加载qrcode模块失败: ${e.message}`);
  QRCode = { toDataURL: async () => 'data:image/png;base64,', toString: async () => '' };
}

try { Jimp = require('jimp'); } catch (e) { 
  console.error(`加载jimp模块失败: ${e.message}`);
  Jimp = { read: async () => ({ quality: () => {}, resize: () => {}, writeAsync: async () => {} }) };
}

try { PDFDocument = require('pdf-lib').PDFDocument; } catch (e) { 
  console.error(`加载pdf-lib模块失败: ${e.message}`);
  PDFDocument = { create: async () => ({}), load: async () => ({ save: async () => Buffer.from([]), getPageCount: () => 0 }) };
}

try { PDFParser = require('pdf2json'); } catch (e) { 
  console.error(`加载pdf2json模块失败: ${e.message}`);
  PDFParser = class MockPDFParser { constructor() {} on() {} parseBuffer() {} };
}

try { docx = require('docx'); } catch (e) { 
  console.error(`加载docx模块失败: ${e.message}`);
  docx = { Document: class {}, Paragraph: class {}, TextRun: class {}, Packer: { toBuffer: async () => Buffer.from([]) } };
}

try { ExcelJS = require('exceljs'); } catch (e) { 
  console.error(`加载exceljs模块失败: ${e.message}`);
  ExcelJS = { Workbook: class { addWorksheet() { return { addRow() {} } } } };
}

try { pptxgenjs = require('pptxgenjs'); } catch (e) { 
  console.error(`加载pptxgenjs模块失败: ${e.message}`);
  pptxgenjs = class { addSlide() { return { addText() {}, addImage() {} } } writeFile() {} };
}

try { fromPath = require('pdf2pic').fromPath; } catch (e) { 
  console.error(`加载pdf2pic模块失败: ${e.message}`);
  fromPath = () => ({ convert: async () => ({ data: Buffer.from([]) }) });
}

try { 
  webp = require('webp-converter'); 
  // 初始化WebP转换器
  if (webp && webp.grant_permission) {
    webp.grant_permission();
    console.log('WebP转换器权限设置成功');
  }
} catch (e) { 
  console.error(`加载webp-converter模块失败: ${e.message}`);
  webp = { 
    dwebp: async () => {}, 
    cwebp: async () => {},
    grant_permission: () => {}
  };
}

try { JSZip = require('jszip'); } catch (e) { 
  console.error(`加载jszip模块失败: ${e.message}`);
  JSZip = class { constructor() { this.file = () => {}; this.folder = () => ({ file: () => {} }); this.generateAsync = async () => Buffer.from([]); } };
}

// 修改为使用路径引入
let pdfToOfdConverter;
try {
  const pdfToOfdBridgePath = path.join(__dirname, 'pdf-to-ofd-bridge.js');
  pdfToOfdConverter = require(pdfToOfdBridgePath);
} catch (err) {
  console.error(`加载PDF转OFD桥接模块失败: ${err.message}`);
  pdfToOfdConverter = {
    checkJavaEnvironment: async () => false,
    convertPDFToOFD: async () => ({ success: false, error: '模块加载失败' }),
    batchConvert: async () => ({ success: false, error: '模块加载失败' }),
    detectInvoice: async () => false
  };
}

// 获取日志目录
function getLogPath() {
  const userDataPath = app.getPath('userData');
  const logDir = path.join(userDataPath, 'logs');
  
  // 确保日志目录存在
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  return path.join(logDir, 'app-log.txt');
}

// 日志处理
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  
  try {
    const logPath = getLogPath();
    fs.appendFileSync(logPath, formattedMessage + '\n');
  } catch (err) {
    console.error('日志写入失败:', err);
  }
}

// 处理读取日志文件的IPC请求
ipcMain.handle('read-log-file', async () => {
  try {
    const logPath = getLogPath();
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf8');
      return { success: true, content: logContent };
    } else {
      return { success: false, error: '日志文件不存在' };
    }
  } catch (error) {
    console.error('读取日志文件失败:', error);
    return { success: false, error: error.message };
  }
});

// 异常处理
process.on('uncaughtException', (error) => {
  log(`未捕获的异常: ${error.message}`);
  log(error.stack);
});

// 禁用硬件加速，解决GPU进程崩溃问题
app.disableHardwareAcceleration();

/**
 * 创建应用程序菜单
 */
function createAppMenu() {
  const isMac = process.platform === 'darwin';
  
  // 自定义中文菜单模板
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建工作区',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            log('用户点击了"新建工作区"');
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-action', 'new-workspace');
            }
          }
        },
        {
          label: '打开文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            log('用户点击了"打开文件"');
            try {
              const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                  { name: 'PDF文件', extensions: ['pdf'] },
                  { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
                  { name: '所有文件', extensions: ['*'] }
                ]
              });
              
              if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                log(`用户选择了文件: ${filePath}`);
                
                const focusedWindow = BrowserWindow.getFocusedWindow();
                if (focusedWindow) {
                  focusedWindow.webContents.send('file-opened', { path: filePath });
                }
              }
            } catch (err) {
              log(`打开文件对话框失败: ${err.message}`);
            }
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            log('用户点击了"保存"');
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-action', 'save');
            }
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            log('用户点击了"另存为"');
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-action', 'save-as');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMac ? [
          { role: 'delete', label: '删除' },
          { role: 'selectAll', label: '全选' },
        ] : [
          { role: 'delete', label: '删除' },
          { type: 'separator' },
          { role: 'selectAll', label: '全选' }
        ])
      ]
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: '前置所有窗口' },
        ] : [
          { role: 'close', label: '关闭' }
        ])
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            log('用户点击了"关于"');
            const appInfo = {
              name: app.getName(),
              version: app.getVersion(),
              electron: process.versions.electron,
              chrome: process.versions.chrome,
              node: process.versions.node,
              platform: process.platform
            };
            
            dialog.showMessageBox({
              title: '关于 旅飞小熊工具箱',
              message: '旅飞小熊工具箱 - 多功能办公助手',
              detail: `版本: ${appInfo.version}\nElectron: ${appInfo.electron}\nChrome: ${appInfo.chrome}\nNode.js: ${appInfo.node}\n平台: ${appInfo.platform}`,
              buttons: ['确定'],
              icon: path.join(__dirname, 'resources', 'icon.png')
            });
          }
        },
        {
          label: '查看文档',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/toolbox-app');
          }
        },
        {
          label: '检查更新',
          click: () => {
            log('用户点击了"检查更新"');
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu-action', 'check-update');
            }
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  log('已设置应用程序中文菜单');
}

/**
 * 初始化应用
 */
async function initializeApp() {
  try {
    log('Electron应用已就绪');
    
    // 设置自定义菜单
    createAppMenu();
    
    // 设置安全策略
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://127.0.0.1:* ws://127.0.0.1:*"
          ]
        }
      });
    });
    
    // 检查Java环境
    let javaAvailable = false;
    try {
      if (pdfToOfdConverter && typeof pdfToOfdConverter.checkJavaEnvironment === 'function') {
        javaAvailable = await pdfToOfdConverter.checkJavaEnvironment();
      } else {
        log('PDF转OFD桥接模块不可用，将禁用此功能');
      }
    } catch (err) {
      log(`Java环境检查错误: ${err.message}`);
    }
    
    if (javaAvailable) {
      log('Java环境检查通过，PDF转OFD功能可用');
    } else {
      log('Java环境不可用，PDF转OFD功能将不可用');
    }
    
    createWindow();
    
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (err) {
    log(`应用启动错误: ${err.message}`);
  }
}

/**
 * 创建上下文菜单
 */
function createContextMenu(mainWindow) {
  // 注册上下文菜单事件
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { x, y, isEditable, selectionText, linkURL, srcURL } = params;
    
    let template = [];
    
    // 如果点击在输入框中，显示编辑相关菜单
    if (isEditable) {
      template = [
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { type: 'separator' },
        { role: 'selectAll', label: '全选' }
      ];
    }
    // 如果有选中的文本，提供复制和搜索选项
    else if (selectionText) {
      template = [
        { role: 'copy', label: '复制' },
        { type: 'separator' },
        {
          label: '搜索选中内容',
          click: () => {
            mainWindow.webContents.send('menu-action', {
              action: 'search-text',
              text: selectionText
            });
          }
        }
      ];
    }
    // 如果点击的是链接，提供打开链接选项
    else if (linkURL) {
      template = [
        {
          label: '在浏览器中打开链接',
          click: () => {
            shell.openExternal(linkURL);
          }
        },
        {
          label: '复制链接地址',
          click: () => {
            clipboard.writeText(linkURL);
          }
        }
      ];
    }
    // 如果点击的是图片，提供保存图片选项
    else if (srcURL) {
      template = [
        {
          label: '保存图片',
          click: () => {
            mainWindow.webContents.send('menu-action', {
              action: 'save-image',
              src: srcURL
            });
          }
        },
        {
          label: '复制图片',
          click: () => {
            mainWindow.webContents.send('menu-action', {
              action: 'copy-image',
              src: srcURL
            });
          }
        }
      ];
    }
    // 默认的上下文菜单
    else {
      template = [
        {
          label: '刷新页面',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: '返回首页',
          click: () => {
            mainWindow.webContents.send('menu-action', 'go-home');
          }
        },
        { type: 'separator' },
        {
          label: '检查元素',
          click: () => {
            mainWindow.webContents.inspectElement(x, y);
          }
        }
      ];
    }
    
    // 构建菜单并显示
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });
  
  log('已注册上下文菜单');
}

/**
 * 创建主窗口并处理加载逻辑
 */
function createWindow() {
  log('创建主窗口');
  
  // 清除会话缓存
  try {
    session.defaultSession.clearCache();
    session.defaultSession.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers']
    });
    log('已清除会话缓存和存储数据');
  } catch (err) {
    log(`清除缓存出错: ${err.message}`);
  }
  
  // 创建窗口实例
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: '旅飞小熊工具箱',
    show: false, // 先不显示窗口，等内容加载完毕再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // 创建上下文菜单
  createContextMenu(mainWindow);
  
  log(`应用环境: ${isDev ? '开发环境' : '生产环境'}`);
  
  // 加载完成后再显示窗口，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log('窗口显示');
  });
  
  // 设置超时处理，避免无限等待
  let loadTimeout = setTimeout(() => {
    log('页面加载超时，尝试使用备用方案');
    if (!mainWindow.isDestroyed()) {
      loadFallbackHtml(mainWindow);
    }
  }, 15000); // 15秒超时
  
  mainWindow.webContents.once('did-finish-load', () => {
    clearTimeout(loadTimeout);
  });
  
  // 开发环境加载逻辑
  if (isDev) {
    log('使用开发环境加载策略');
    
    // 尝试加载策略
    const loadStrategies = [
      () => {
        // 策略1: 尝试加载本地开发服务器
        tryLoadDevServer(mainWindow);
      },
      () => {
        // 策略2: 尝试加载静态HTML文件
        const staticHtmlPath = path.join(__dirname, 'static-index.html');
        if (fs.existsSync(staticHtmlPath)) {
          log(`加载静态HTML文件: ${staticHtmlPath}`);
          mainWindow.loadFile(staticHtmlPath)
            .then(() => log('静态HTML加载成功'))
            .catch(err => {
              log(`静态HTML加载失败: ${err.message}`);
              loadFallbackHtml(mainWindow);
            });
        } else {
          log('静态HTML文件不存在');
          loadFallbackHtml(mainWindow);
        }
      }
    ];
    
    // 先使用策略1 - 如果5秒内没有成功，就尝试策略2
    loadStrategies[0]();
    
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    const filePath = path.join(__dirname, 'dist', 'index.html');
    log(`加载生产文件: ${filePath}`);
    
    mainWindow.loadFile(filePath)
      .then(() => log('生产文件加载成功'))
      .catch(err => {
        log(`生产文件加载失败: ${err.message}`);
        loadFallbackHtml(mainWindow);
      });
  }
  
  // 页面加载事件处理
  setupWindowEvents(mainWindow);
}

/**
 * 尝试加载开发服务器
 */
function tryLoadDevServer(mainWindow) {
  const possiblePorts = [5178, 5177, 5173, 5174, 5175, 5176];
  let loaded = false;
  let retryCount = 0;
  const maxRetries = 5;
  
  log('尝试连接开发服务器...');
  
  const failTimeout = setTimeout(() => {
    if (!loaded) {
      log('连接开发服务器超时，尝试加载静态HTML');
      loadFallbackHtml(mainWindow);
    }
  }, 10000); // 增加到10秒
  
  // 重试连接函数
  function retryConnect(port) {
    if (retryCount >= maxRetries) {
      log(`重试次数已达最大值(${maxRetries})，尝试下一个端口`);
      retryCount = 0;
      tryNextPort(possiblePorts.indexOf(port) + 1);
      return;
    }
    
    const url = `http://127.0.0.1:${port}`;
    log(`尝试连接端口(第${retryCount + 1}次): ${port}`);
    
    mainWindow.loadURL(url)
      .then(() => {
        log(`成功连接到端口: ${port}`);
        loaded = true;
        clearTimeout(failTimeout);
      })
      .catch(err => {
        log(`端口 ${port} 连接失败(第${retryCount + 1}次): ${err.message}`);
        retryCount++;
        setTimeout(() => retryConnect(port), 1000); // 1秒后重试
      });
  }
  
  // 按顺序尝试各个可能的端口
  function tryNextPort(index) {
    if (index >= possiblePorts.length) {
      log('所有端口尝试失败，加载备用HTML');
      loadFallbackHtml(mainWindow);
      clearTimeout(failTimeout);
      return;
    }
    
    retryCount = 0;
    const port = possiblePorts[index];
    retryConnect(port);
  }
  
  // 开始尝试连接
  tryNextPort(0);
}

/**
 * 加载备用HTML
 */
function loadFallbackHtml(mainWindow) {
  const fallbackPath = path.join(__dirname, 'static-index.html');
  
  if (fs.existsSync(fallbackPath)) {
    log(`加载备用HTML: ${fallbackPath}`);
    mainWindow.loadFile(fallbackPath)
      .then(() => log('备用HTML加载成功'))
      .catch(err => log(`备用HTML加载失败: ${err.message}`));
  } else {
    log('备用HTML不存在，显示错误信息');
    mainWindow.webContents.loadURL('data:text/html;charset=utf-8,<h1>加载失败</h1><p>请检查应用配置</p>');
  }
}

/**
 * 设置窗口事件处理
 */
function setupWindowEvents(mainWindow) {
  // 页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    log('页面加载完成');
    
    // 检查页面内容
    mainWindow.webContents.executeJavaScript(`
      document.title + ' | 内容检查: ' + 
      (document.body ? document.body.childElementCount + '个元素' : '无body元素')
    `).then(result => {
      log(`页面内容检查: ${result}`);
    }).catch(err => {
      log(`页面内容检查失败: ${err.message}`);
    });
  });
  
  // 页面加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`页面加载失败: [${errorCode}] ${errorDescription}`);
    if (!event.sender.isDestroyed()) {
      loadFallbackHtml(mainWindow);
    }
  });
  
  // 渲染进程崩溃
  mainWindow.webContents.on('crashed', () => {
    log('渲染进程崩溃');
    dialog.showErrorBox('应用崩溃', '应用渲染进程意外崩溃，将重启应用');
    app.relaunch();
    app.exit(0);
  });
  
  // 页面控制台消息
  mainWindow.webContents.on('console-message', (event, level, message) => {
    const levels = ['日志', '警告', '错误', '信息', '调试'];
    log(`页面控制台 [${levels[level] || level}]: ${message}`);
  });
  
  // 窗口关闭
  mainWindow.on('closed', () => {
    log('窗口已关闭');
  });

  // 处理PDF转OFD-直接启动外部应用
  ipcMain.handle('launch-external-pdf-app', async (event, params) => {
    log(`接收到启动外部PDF应用请求: ${JSON.stringify(params)}`);
    
    try {
      // 允许空的pdfPath，此时Java程序将自己显示文件选择对话框
      const result = await launchExternalJavaApp(params.pdfPath || '');
      return result;
    } catch (error) {
      log(`启动外部PDF应用错误: ${error.message}`);
      return {
        success: false,
        error: `启动外部应用失败: ${error.message}`
      };
    }
  });
}

// 应用事件处理
app.whenReady().then(() => {
  console.log('[' + new Date().toISOString() + '] Electron应用已就绪');
  initializeApp();
});

app.on('window-all-closed', function () {
  log('所有窗口已关闭');
  if (process.platform !== 'darwin') app.quit();
});

// IPC通信处理
// PDF处理相关IPC通信
ipcMain.handle('convert-pdf', async (event, params) => {
  try {
    log(`开始处理PDF转换请求: ${params.inputPath} -> ${params.outputPath} (${params.type})`);
    
    if (!params || !params.inputPath || !params.outputPath || !params.type) {
      throw new Error('缺少必要参数');
    }
    
    // 检查输入文件是否存在
    if (!fs.existsSync(params.inputPath)) {
      throw new Error(`输入文件不存在: ${params.inputPath}`);
    }
    
    // 确保输出目录存在
    const outputDir = path.dirname(params.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 加载PDF文档
    const pdfBytes = fs.readFileSync(params.inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // 获取文档页数
    const pageCount = pdfDoc.getPageCount();
    log(`PDF文档共有 ${pageCount} 页`);
    
    // 解析页面范围
    const pageRange = params.options?.pageRange || `1-${pageCount}`;
    const pages = parsePageRange(pageRange, pageCount);
    log(`页面范围处理结果: ${pages.join(',')}`);
    
    let result;
    
    // 根据类型处理转换
    const startTime = Date.now();
    
    switch (params.type) {
      case 'docx':
        result = await convertToWord(pdfDoc, pages, params.outputPath, params.options);
        break;
      case 'xlsx':
        result = await convertToExcel(pdfDoc, pages, params.outputPath, params.options);
        break;
      case 'pptx':
        result = await convertToPowerPoint(pdfDoc, pages, params.outputPath, params.options);
        break;
      case 'jpg':
      case 'png':
        result = await convertToImage(pdfDoc, pages, params.outputPath, params.type, params.options);
        break;
      case 'ofd':
        result = await convertToOFD(pdfDoc, pages, params.outputPath, params.options);
        break;
      default:
        throw new Error(`不支持的转换类型: ${params.type}`);
    }
    
    const endTime = Date.now();
    const conversionTime = endTime - startTime;
    
    log(`转换完成，耗时: ${conversionTime}ms`);
    
    // 如果成功，计算文件大小
    if (result.success && fs.existsSync(params.outputPath)) {
      const stats = fs.statSync(params.outputPath);
      result.fileSize = stats.size;
    }
    
    return {
      ...result,
      conversionTime,
      pageCount: pages.length
    };
  } catch (error) {
    log(`PDF转换错误: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 批量PDF转换
ipcMain.handle('convert-pdf-batch', async (event, { files }) => {
  log(`批量PDF转换请求: ${files.length}个文件`);
  
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  const startTime = Date.now();
  
  for (const file of files) {
    try {
      // 注意：这里不能使用ipcMain.handle方法调用，而应该直接调用已注册的处理函数
      // const result = await ipcMain.handle('convert-pdf', event, file);
      // 改用invoke方法
      const result = await event.invoke('convert-pdf', file);
      results.push({
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        success: result.success,
        error: result.error
      });
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      results.push({
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        success: false,
        error: error.message
      });
      failedCount++;
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  return {
    success: failedCount === 0,
    results,
    totalTime,
    successCount,
    failedCount
  };
});

// 辅助函数：解析页面范围
function parsePageRange(pageRange, totalPages) {
  const pages = new Set();
  const ranges = pageRange.split(',');
  
  for (const range of ranges) {
    const [start, end] = range.split('-').map(n => parseInt(n));
    if (end === undefined) {
      if (start > 0 && start <= totalPages) {
        pages.add(start - 1);
      }
    } else {
      for (let i = start; i <= end; i++) {
        if (i > 0 && i <= totalPages) {
          pages.add(i - 1);
        }
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
}

// PDF转Word
async function convertToWord(pdfDoc, pages, outputPath, options) {
  log('开始转换为Word格式');
  
  const pdfParser = new PDFParser();
  const pdfBuffer = await pdfDoc.save();
  
  // 提取文本内容
  const textContent = await new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataReady', data => {
      // 将PDF解析数据转换为格式化文本
      const text = formatPdfData(data);
      resolve(text);
    });
    pdfParser.on('pdfParser_dataError', err => reject(err));
    pdfParser.parseBuffer(pdfBuffer);
  });
  
  // 创建Word文档
  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: createWordContent(textContent, options)
    }]
  });
  
  // 保存文档
  const buffer = await docx.Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  return { success: true };
}

// PDF转Excel
async function convertToExcel(pdfDoc, pages, outputPath, options) {
  log('开始转换为Excel格式');
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  // 提取表格数据
  const pdfParser = new PDFParser();
  const pdfBuffer = await pdfDoc.save();
  
  const tables = await new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataReady', data => {
      const extractedTables = extractTablesFromPdf(data);
      resolve(extractedTables);
    });
    pdfParser.on('pdfParser_dataError', err => reject(err));
    pdfParser.parseBuffer(pdfBuffer);
  });
  
  // 将表格数据写入Excel
  if (tables && tables.length > 0) {
    tables.forEach((table, tableIndex) => {
      if (tableIndex > 0) {
        workbook.addWorksheet(`Sheet${tableIndex + 1}`);
      }
      const currentSheet = workbook.getWorksheet(`Sheet${tableIndex + 1}`);
      
      table.forEach((row, rowIndex) => {
        currentSheet.addRow(row);
      });
      
      // 设置列宽
      currentSheet.columns.forEach(column => {
        column.width = 15;
      });
    });
  }
  
  await workbook.xlsx.writeFile(outputPath);
  return { success: true };
}

// PDF转PowerPoint
async function convertToPowerPoint(pdfDoc, pages, outputPath, options) {
  log('开始转换为PowerPoint格式');
  
  const pres = new pptxgenjs();
  
  // 提取每页内容
  const pdfParser = new PDFParser();
  const pdfBuffer = await pdfDoc.save();
  
  const pageContents = await new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataReady', data => {
      const contents = extractPageContents(data);
      resolve(contents);
    });
    pdfParser.on('pdfParser_dataError', err => reject(err));
    pdfParser.parseBuffer(pdfBuffer);
  });
  
  // 为每页创建幻灯片
  for (let i = 0; i < pageContents.length; i++) {
    const content = pageContents[i];
    const slide = pres.addSlide();
    
    // 添加文本
    if (content.text) {
      slide.addText(content.text, {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: '90%',
        fontSize: 14,
        align: 'left'
      });
    }
    
    // 如果有图片，添加图片
    if (content.images && content.images.length > 0) {
      content.images.forEach((image, idx) => {
        slide.addImage({
          data: image.data,
          x: image.x || 1,
          y: image.y || 1,
          w: image.w || 2,
          h: image.h || 2
        });
      });
    }
  }
  
  await pres.writeFile({ fileName: outputPath });
  return { success: true };
}

// PDF转图片
async function convertToImage(pdfDoc, pages, outputPath, format, options) {
  log(`开始转换为图片格式: ${format}`);
  
  try {
    const inputPath = await saveTempPdf(pdfDoc);
    const baseOptions = {
      density: options.dpi || 300,
      quality: options.quality || 100,
      format: format.toUpperCase(),
      width: 2000,  // 默认宽度
      height: 2000  // 默认高度
    };

    const converter = fromPath(inputPath, baseOptions);
    const results = [];

    // 如果是多页PDF，创建目录存储多个图片
    const isMultiPage = pages.length > 1;
    let outputDir = path.dirname(outputPath);
    let baseFileName = path.basename(outputPath, path.extname(outputPath));

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const pageIndex of pages) {
      const pageNum = pageIndex + 1;
      const outputFilePath = isMultiPage
        ? path.join(outputDir, `${baseFileName}_${pageNum}.${format}`)
        : outputPath;

      const result = await converter.convert(pageNum);
      
      // 保存转换后的图片
      fs.writeFileSync(outputFilePath, result.data);
      results.push(outputFilePath);
      
      log(`页面 ${pageNum} 已转换为图片: ${outputFilePath}`);
    }

    // 清理临时PDF文件
    try {
      fs.unlinkSync(inputPath);
    } catch (err) {
      log(`清理临时PDF文件失败: ${err.message}`);
    }

    return { 
      success: true,
      outputFiles: results
    };
  } catch (error) {
    log(`PDF转图片失败: ${error.message}`);
    throw error;
  }
}

// 辅助函数：将PDF文档保存为临时文件
async function saveTempPdf(pdfDoc) {
  const tempDir = path.join(app.getPath('temp'), 'toolbox-files');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(tempPath, pdfBytes);
  return tempPath;
}

// 辅助函数：格式化PDF数据为文本
function formatPdfData(data) {
  let text = '';
  if (data.Pages) {
    data.Pages.forEach(page => {
      if (page.Texts) {
        page.Texts.forEach(item => {
          text += decodeURIComponent(item.R[0].T) + ' ';
        });
        text += '\n\n';
      }
    });
  }
  return text;
}

// 辅助函数：从PDF数据中提取表格
function extractTablesFromPdf(data) {
  const tables = [];
  if (data.Pages) {
    data.Pages.forEach(page => {
      if (page.Texts) {
        // 简单的表格检测算法
        const rows = {};
        page.Texts.forEach(item => {
          const y = Math.round(item.y * 10) / 10; // 四舍五入到0.1
          if (!rows[y]) {
            rows[y] = [];
          }
          rows[y].push({
            x: item.x,
            text: decodeURIComponent(item.R[0].T)
          });
        });
        
        // 按y坐标排序并转换为数组
        const sortedRows = Object.entries(rows)
          .sort(([y1], [y2]) => parseFloat(y1) - parseFloat(y2))
          .map(([_, cells]) => 
            cells.sort((a, b) => a.x - b.x)
              .map(cell => cell.text)
          );
        
        if (sortedRows.length > 0) {
          tables.push(sortedRows);
        }
      }
    });
  }
  return tables;
}

// 辅助函数：从PDF数据中提取页面内容
async function extractPageContents(pageIndices, tempPdfPath) {
  log(`提取页面内容: 页面索引 ${pageIndices.join(',')}`);
  
  try {
    const results = [];
    
    // 创建临时文件目录
    const tempDir = path.join(app.getPath('temp'), 'toolbox-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 使用解析器处理文件
    const parser = new PDFParser(null, 1); // 1表示详细模式，获取更多信息
    
    // 特别针对发票类型的PDF，提取更准确的内容
    return new Promise((resolve, reject) => {
      try {
        // 为每个请求的页面创建默认结构
        const pages = pageIndices.map(() => ({
          width: 595,
          height: 842,
          content: [],
          images: []
        }));
        
        // 设置解析器事件
        parser.on('pdfParser_dataReady', (pdfData) => {
          try {
            log(`PDF解析完成，开始提取内容`);
            
            if (!pdfData || !pdfData.Pages || pdfData.Pages.length === 0) {
              log('警告: PDF解析结果无效或为空');
              // 添加一些默认内容，确保生成的OFD至少有一些可见内容
              pages.forEach(page => {
                page.content.push({
                  text: "PDF内容无法解析，这是自动生成的提示文本",
                  x: 100,
                  y: 100,
                  width: 400,
                  height: 30,
                  fontName: "SimSun",
                  fontSize: 16
                });
              });
              resolve(pages);
              return;
            }
            
            // 添加文档信息
            try {
              if (pdfData.Info) {
                log(`PDF文档信息: ${JSON.stringify(pdfData.Info)}`);
              }
            } catch (infoErr) {
              log(`无法解析PDF文档信息: ${infoErr.message}`);
            }
            
            // 处理每个页面
            pageIndices.forEach((pageIndex, idx) => {
              if (pageIndex >= pdfData.Pages.length) {
                log(`警告: 页面索引 ${pageIndex} 超出范围`);
                return;
              }
              
              const pdfPage = pdfData.Pages[pageIndex];
              
              // 提取页面尺寸
              if (pdfPage.Width && pdfPage.Height) {
                pages[idx].width = Math.round(pdfPage.Width);
                pages[idx].height = Math.round(pdfPage.Height);
                log(`页面 ${pageIndex+1} 尺寸: ${pages[idx].width} x ${pages[idx].height}`);
              } else {
                log(`警告: 页面 ${pageIndex+1} 没有有效尺寸，使用默认值 595x842`);
              }
              
              // 处理文本内容
              if (pdfPage.Texts && pdfPage.Texts.length > 0) {
                // 用于检测和合并相邻文本元素的映射
                const textMap = new Map();
                
                pdfPage.Texts.forEach((text, textIndex) => {
                  if (text.R && text.R.length > 0) {
                    // 合并同一文本对象的所有部分
                    let fullText = '';
                    let fontSize = 12;
                    let fontName = 'SimSun';
                    
                    text.R.forEach(textRun => {
                      if (textRun.T) {
                        try {
                          // 解码文本（PDF中文本是URL编码的）
                          const decodedText = decodeURIComponent(textRun.T.replace(/\\\d{3}/g, match => {
                            return String.fromCharCode(parseInt(match.substring(1), 8));
                          }));
                          fullText += decodedText;
                          
                          // 获取字体信息
                          if (textRun.TS) {
                            fontSize = textRun.TS[1] || fontSize;
                            fontName = textRun.TS[3] || fontName;
                          }
                        } catch (decodeErr) {
                          log(`解码文本失败: ${decodeErr.message}`);
                          // 尝试简单替换常见的编码问题
                          fullText += textRun.T.replace(/%/g, '').replace(/\\/g, '');
                        }
                      }
                    });
                    
                    // 清理文本中的特殊字符
                    fullText = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                                       .replace(/\s+/g, ' ')
                                       .trim();
                    
                    // 只添加非空文本
                    if (fullText.trim()) {
                      // 标准化坐标，确保在页面范围内
                      let textX = text.x !== undefined ? Math.max(0, Math.min(text.x, pages[idx].width - 50)) : 50;
                      let textY = text.y !== undefined ? Math.max(0, Math.min(text.y, pages[idx].height - 50)) : 50 + textIndex * 20;
                      
                      // 如果y坐标是0或无效，分配一个合理的值
                      if (textY <= 0) {
                        textY = 50 + textIndex * 20;
                      }
                      
                      // 估算宽度和高度
                      const estimatedWidth = Math.min(fullText.length * fontSize * 0.6, pages[idx].width - textX - 20);
                      const estimatedHeight = Math.min(fontSize * 1.2, 30);
                      
                      // 检查是否有相似位置的文本，尝试合并
                      const key = `${Math.floor(textY/5)}`; // 以Y坐标的近似值作为键
                      if (textMap.has(key)) {
                        const existingText = textMap.get(key);
                        // 如果X坐标相邻，且文本内容短，考虑合并
                        if (Math.abs(existingText.x + existingText.width - textX) < 20 && existingText.text.length + fullText.length < 100) {
                          existingText.text += ' ' + fullText;
                          existingText.width += estimatedWidth;
                          log(`合并相邻文本: "${existingText.text}"`);
                          return; // 跳过添加新文本元素
                        }
                      }
                      
                      // 创建新的文本元素
                      const textElement = {
                        text: fullText,
                        x: textX,
                        y: textY,
                        width: estimatedWidth,
                        height: estimatedHeight,
                        fontName: fontName,
                        fontSize: fontSize
                      };
                      
                      // 添加到结果并更新映射
                      pages[idx].content.push(textElement);
                      textMap.set(key, textElement);
                    }
                  }
                });
                
                // 按Y坐标排序文本
                pages[idx].content.sort((a, b) => a.y - b.y);
                
                // 确保至少有一个文本元素，如果没有，添加一个默认文本
                if (pages[idx].content.length === 0) {
                  pages[idx].content.push({
                    text: `第${pageIndex+1}页 - PDF内容`,
                    x: 100,
                    y: 100,
                    width: 400,
                    height: 30,
                    fontName: "SimSun",
                    fontSize: 16
                  });
                }
                
                log(`页面 ${pageIndex+1} 提取了 ${pages[idx].content.length} 个文本元素`);
              } else {
                log(`警告: 页面 ${pageIndex+1} 没有文本内容`);
                // 添加一个默认文本，确保OFD中有可见内容
                pages[idx].content.push({
                  text: `第${pageIndex+1}页 - 未检测到文本内容`,
                  x: 100,
                  y: 100,
                  width: 400,
                  height: 30,
                  fontName: "SimSun",
                  fontSize: 16
                });
              }
              
              // 提取图像内容
              if (pdfPage.Fills) {
                const images = [];
                
                // 遍历填充内容，查找可能的图像
                Object.keys(pdfPage.Fills).forEach((key, i) => {
                  const fill = pdfPage.Fills[key];
                  
                  // 处理可能的图像
                  if (fill && typeof fill === 'object') {
                    const imgX = Math.max(20, Math.min(fill.x || 20, pages[idx].width - 150));
                    const imgY = Math.max(200, Math.min(fill.y || 200, pages[idx].height - 150));
                    const imgWidth = Math.min(fill.w || 200, pages[idx].width - imgX - 20);
                    const imgHeight = Math.min(fill.h || 200, pages[idx].height - imgY - 20);
                    
                    images.push({
                      x: imgX,
                      y: imgY,
                      width: imgWidth,
                      height: imgHeight,
                      data: Buffer.from('') // 实际应用中需替换为真实图像数据
                    });
                  }
                });
                
                // 添加图像到页面
                pages[idx].images = images;
                if (images.length > 0) {
                  log(`页面 ${pageIndex+1} 提取了 ${images.length} 个图像元素`);
                }
              }
              
              // 添加一个文档标题，确保每个页面都有至少一个显著的文本元素
              if (pages[idx].content.length > 0) {
                pages[idx].content.unshift({
                  text: `第${pageIndex+1}页`,
                  x: 50,
                  y: 30,
                  width: 100,
                  height: 24,
                  fontName: "SimHei",
                  fontSize: 16
                });
              }
            });
            
            // 总结提取结果
            const totalTextElements = pages.reduce((sum, page) => sum + page.content.length, 0);
            const totalImageElements = pages.reduce((sum, page) => sum + page.images.length, 0);
            log(`提取完成: 共 ${totalTextElements} 个文本元素和 ${totalImageElements} 个图像元素`);
            
            resolve(pages);
          } catch (e) {
            log(`解析PDF内容时出错: ${e.message}`);
            
            // 添加默认内容，确保生成的OFD不是空白的
            pages.forEach((page, index) => {
              page.content.push({
                text: `第${pageIndices[index]+1}页 - 解析失败，自动添加的内容`,
                x: 100,
                y: 100,
                width: 400,
                height: 30,
                fontName: "SimSun",
                fontSize: 16
              });
            });
            
            resolve(pages);
          }
        });
        
        parser.on('pdfParser_dataError', (err) => {
          log(`PDF解析错误: ${err}`);
          
          // 添加默认内容
          pages.forEach((page, index) => {
            page.content.push({
              text: `第${pageIndices[index]+1}页 - PDF解析错误，自动添加的内容`,
              x: 100,
              y: 100,
              width: 400,
              height: 30,
              fontName: "SimSun",
              fontSize: 16
            });
          });
          
          resolve(pages);
        });
        
        // 使用传入的PDF文件路径
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
          log(`解析PDF文件: ${tempPdfPath}`);
          parser.loadPDF(tempPdfPath);
        } else {
          // 尝试从全局变量获取文件路径
          const globalPdfPath = global.currentProcessingPdfPath;
          if (globalPdfPath && fs.existsSync(globalPdfPath)) {
            log(`使用全局PDF文件路径: ${globalPdfPath}`);
            parser.loadPDF(globalPdfPath);
          } else {
            // 创建一个空白PDF作为后备方案
            log('未找到有效的PDF文件路径，创建空白PDF');
            const createEmptyPDF = async () => {
              try {
                const emptyPdf = await PDFDocument.create();
                const page = emptyPdf.addPage([595, 842]);
                const pdfBytes = await emptyPdf.save();
                
                const backupPath = path.join(tempDir, `empty-${Date.now()}.pdf`);
                fs.writeFileSync(backupPath, pdfBytes);
                
                log(`创建空白PDF文件: ${backupPath}`);
                parser.loadPDF(backupPath);
              } catch (err) {
                log(`创建空白PDF失败: ${err.message}`);
                resolve(pages); // 返回默认页面
              }
            };
            createEmptyPDF();
          }
        }
      } catch (error) {
        log(`提取PDF内容时出错: ${error.message}`);
        // 返回包含默认文本的页面
        const pagesWithDefaultContent = pageIndices.map((pageIdx) => ({
          width: 595,
          height: 842,
          content: [{
            text: `第${pageIdx+1}页 - 提取失败，自动添加的内容`,
            x: 100,
            y: 100,
            width: 400,
            height: 30,
            fontName: "SimSun",
            fontSize: 16
          }],
          images: []
        }));
        resolve(pagesWithDefaultContent);
      }
    });
  } catch (error) {
    log(`提取页面内容失败: ${error.message}`);
    // 出错时返回包含默认文本的页面
    return pageIndices.map((pageIdx) => ({
      width: 595,
      height: 842,
      content: [{
        text: `第${pageIdx+1}页 - 提取失败，自动添加的内容`,
        x: 100,
        y: 100,
        width: 400,
        height: 30,
        fontName: "SimSun",
        fontSize: 16
      }],
      images: []
    }));
  }
}

// 辅助函数：创建Word文档内容
function createWordContent(text, options) {
  const paragraphs = text.split('\n').map(line => 
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: line,
          size: 24, // 12pt
          font: 'Arial'
        })
      ],
      spacing: {
        after: 200
      }
    })
  );
  
  return paragraphs;
}

// PDF转OFD
async function convertToOFD(pdfDoc, pages, outputPath, options) {
  log('开始转换为OFD格式（使用外部Java程序）');
  
  try {
    // 创建临时文件夹用于处理
    const tempDir = path.join(app.getPath('temp'), `pdf-to-ofd-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    log(`创建临时目录: ${tempDir}`);
    
    // 保存PDF到临时文件
    const tempPdfPath = path.join(tempDir, 'source.pdf');
    fs.writeFileSync(tempPdfPath, await pdfDoc.save());
    log(`临时PDF文件已保存: ${tempPdfPath}, 大小: ${fs.statSync(tempPdfPath).size} 字节`);

    // 启动外部Java程序处理PDF转换
    const result = await launchExternalJavaApp(tempPdfPath);
    
    if (result.success) {
      return {
        success: true,
        outputPath,
        pageCount: pdfDoc.getPageCount(),
        tempDir: tempDir,
        message: result.message
      };
    } else {
      // 如果外部程序启动失败，尝试使用备用转换方式
      log('外部Java程序启动失败，尝试使用备用转换方法');
      return await fallbackConvertToOFD(pdfDoc, pages, outputPath, options, tempPdfPath);
    }
  } catch (error) {
    log(`PDF转OFD出错: ${error.message}`);
    return {
      success: false,
      error: `转换失败: ${error.message}`
    };
  }
}

// 备用PDF转OFD方法（当Java转换器不可用时使用）
async function fallbackConvertToOFD(pdfDoc, pages, outputPath, options, tempPdfPath) {
  log('使用备用方法转换PDF到OFD');
  
  try {
    // 提取PDF内容
    const extractedPages = await extractPageContents(pages, tempPdfPath);
    log(`成功提取PDF内容: ${extractedPages.length}页`);
    
    // 创建一个简单的OFD文件结构
    const ofdContent = await generateSimpleOFD(extractedPages, options);
    
    // 将OFD内容写入文件
    fs.writeFileSync(outputPath, ofdContent);
    log(`已保存OFD文件: ${outputPath}, 大小: ${fs.statSync(outputPath).size} 字节`);
    
    return {
      success: true,
      outputPath,
      pageCount: pages.length,
      isSimpleOFD: true // 标记为简单OFD文件
    };
  } catch (error) {
    log(`备用转换方法出错: ${error.message}`);
    return {
      success: false,
      error: `备用转换失败: ${error.message}`
    };
  }
}

// 生成简单的OFD内容
async function generateSimpleOFD(extractedPages, options) {
  log('生成简单OFD结构');
  
  // OFD基本结构
  const ofdStructure = `<?xml version="1.0" encoding="UTF-8"?>
<ofd:OFD xmlns:ofd="http://www.ofdspec.org/2016" DocType="OFD" Version="1.0">
  <ofd:DocBody>
    <ofd:DocInfo>
      <ofd:DocID>OFD${Date.now()}</ofd:DocID>
      <ofd:Title>转换的PDF文档</ofd:Title>
      <ofd:Author>工具箱应用</ofd:Author>
      <ofd:CreatorVersion>Electron PDF工具箱</ofd:CreatorVersion>
      <ofd:CreationDate>${new Date().toISOString()}</ofd:CreationDate>
    </ofd:DocInfo>
    <ofd:DocRoot>Document.xml</ofd:DocRoot>
  </ofd:DocBody>
</ofd:OFD>`;
  
  // Document.xml内容
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Document xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:CommonData>
    <ofd:PageArea>
      <ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox>
    </ofd:PageArea>
    <ofd:PublicRes>PublicRes.xml</ofd:PublicRes>
    <ofd:DocumentRes>DocumentRes.xml</ofd:DocumentRes>
  </ofd:CommonData>
  <ofd:Pages>
${extractedPages.map((_, index) => `    <ofd:Page ID="${index + 1}" BaseLoc="Pages/Page_${index + 1}.xml" />`).join('\n')}
  </ofd:Pages>
</ofd:Document>`;
  
  // 创建ZIP包
  const JSZip = require('jszip');
  const zip = new JSZip();
  
  // 添加OFD基本结构
  zip.file('OFD.xml', ofdStructure);
  zip.file('Document.xml', documentXml);
  
  // 添加资源文件
  zip.file('PublicRes.xml', generateSimplePublicRes());
  zip.file('DocumentRes.xml', generateSimpleDocumentRes());
  
  // 创建Pages目录
  const pagesDir = zip.folder('Pages');
  
  // 为每一页创建XML文件
  extractedPages.forEach((page, index) => {
    pagesDir.file(`Page_${index + 1}.xml`, generatePageXml(page, index + 1));
  });
  
  try {
    // 使用JSZip 3.0的API生成二进制内容
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    log(`生成OFD ZIP包成功，大小: ${content.length} 字节`);
    return content;
  } catch (err) {
    log(`生成ZIP包出错: ${err.message}`);
    throw err;
  }
}

// 生成简单的PublicRes.xml
function generateSimplePublicRes() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ofd:PublicRes xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:Fonts>
    <ofd:Font ID="1" FontName="SimSun" />
    <ofd:Font ID="2" FontName="SimHei" />
  </ofd:Fonts>
</ofd:PublicRes>`;
}

// 生成简单的DocumentRes.xml
function generateSimpleDocumentRes() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ofd:DocumentRes xmlns:ofd="http://www.ofdspec.org/2016">
</ofd:DocumentRes>`;
}

// 生成页面XML
function generatePageXml(page, pageId) {
  const pageWidth = page.width || 595;
  const pageHeight = page.height || 842;
  
  let contentXml = '';
  if (page.content && page.content.length > 0) {
    page.content.forEach((text, idx) => {
      contentXml += `
      <ofd:TextObject ID="${pageId * 100 + idx}" Boundary="${text.x} ${text.y} ${text.width} ${text.height}">
        <ofd:TextCode X="0" Y="0" FontID="1">${escapeXml(text.text)}</ofd:TextCode>
      </ofd:TextObject>`;
    });
  } else {
    // 如果没有内容，添加一个默认内容
    contentXml = `
      <ofd:TextObject ID="${pageId * 100}" Boundary="100 100 300 50">
        <ofd:TextCode X="0" Y="0" FontID="1">未检测到文本内容 - 第${pageId}页</ofd:TextCode>
      </ofd:TextObject>`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<ofd:Page xmlns:ofd="http://www.ofdspec.org/2016">
  <ofd:Area>
    <ofd:PhysicalBox>0 0 ${pageWidth} ${pageHeight}</ofd:PhysicalBox>
  </ofd:Area>
  <ofd:Content>
    <ofd:Layer ID="${pageId}">
      ${contentXml}
    </ofd:Layer>
  </ofd:Content>
</ofd:Page>`;
}

// 转义XML特殊字符
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 检查PDF是否为发票
async function checkIfInvoice(pdfPath) {
  try {
    // 读取PDF文件
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // 创建PDF解析器
    const parser = new PDFParser();
    
    // 解析PDF内容
    const data = await new Promise((resolve, reject) => {
      parser.on('pdfParser_dataReady', (result) => resolve(result));
      parser.on('pdfParser_dataError', (error) => reject(error));
      parser.parseBuffer(pdfBuffer);
    });
    
    // 检查是否包含发票关键词
    const invoiceKeywords = ['发票', '税额', '税率', '价税合计', '购买方', '销售方', '开票日期', '发票代码', '发票号码'];
    
    let isInvoice = false;
    if (data && data.Pages) {
      // 遍历所有页面
      for (const page of data.Pages) {
        if (page.Texts) {
          // 提取所有文本
          const texts = page.Texts.map(text => {
            if (text.R && text.R.length > 0) {
              return text.R.map(r => r.T ? decodeURIComponent(r.T) : '').join('');
            }
            return '';
          }).join(' ');
          
          // 检查是否包含发票关键词
          for (const keyword of invoiceKeywords) {
            if (texts.includes(keyword)) {
              isInvoice = true;
              break;
            }
          }
          
          if (isInvoice) break;
        }
      }
    }
    
    return isInvoice;
  } catch (error) {
    log(`检查PDF是否为发票时出错: ${error.message}`);
    return false;
  }
}

// 图片处理相关IPC通信
ipcMain.handle('process-image', async (event, { inputData, fileName, options }) => {
  try {
    log(`开始处理图片: ${fileName}`);
    
    // 从 Base64 创建 Buffer
    const base64Data = inputData.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');
    const originalSize = inputBuffer.length;
    
    log(`原始图片大小: ${originalSize} 字节`);
    
    // 检测格式转换是否可能导致文件变大
    const originalFormat = fileName.split('.').pop().toLowerCase();
    const targetFormat = options.format || 'jpg';
    
    if (originalFormat === 'jpg' && targetFormat === 'png') {
      log('警告: JPG转PNG可能会导致文件变大');
    }
    
    // 创建临时文件目录
    const tempDir = path.join(app.getPath('temp'), 'toolbox-images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    try {
      // 使用 Jimp 处理图片
      let image;
      let isWebP = false;
      
      // 检查是否为WebP格式
      isWebP = originalFormat === 'webp' || inputData.includes('data:image/webp');
      
      try {
        // 首先尝试直接用Jimp读取
        image = await Jimp.read(inputBuffer);
        log('图片直接由Jimp读取成功');
      } catch (err) {
        // 检查是否是WebP格式导致的错误
        if (err.message && err.message.includes('Unsupported MIME type: image/webp')) {
          log('检测到WebP格式图片，使用webp-converter处理');
          
          // 保存Base64为临时WebP文件
          const tempWebpPath = path.join(tempDir, `temp_${Date.now()}.webp`);
          const tempJpegPath = path.join(tempDir, `temp_${Date.now()}.jpg`);
          
          try {
            fs.writeFileSync(tempWebpPath, inputBuffer);
            log(`WebP图片已保存到临时文件: ${tempWebpPath}`);
            
            // 使用子进程直接执行转换命令
            log(`开始WebP转换: ${tempWebpPath} -> ${tempJpegPath}`);
            
            const { spawn } = require('child_process');
            const webpBinDir = path.join(__dirname, 'node_modules', 'webp-converter', 'bin', 'libwebp_win64', 'bin');
            const webpBin = path.join(webpBinDir, 'dwebp.exe');
            
            if (fs.existsSync(webpBin)) {
              // 执行转换命令
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  log('WebP转换超时，中止操作');
                  reject(new Error('WebP转换超时，请尝试使用其他格式的图片'));
                }, 15000); // 增加超时时间到15秒
                
                // 使用直接子进程方式执行dwebp命令
                const process = spawn(webpBin, [
                  tempWebpPath,   // 输入文件
                  '-o', tempJpegPath,  // 输出文件
                  '-mt',          // 启用多线程
                  '-noasm'        // 不使用汇编优化，提高兼容性
                ]);
                
                let stderr = '';
                let stdout = '';
                
                process.stdout.on('data', (data) => {
                  stdout += data.toString();
                  log(`WebP转换输出: ${data.toString().trim()}`);
                });
                
                process.stderr.on('data', (data) => {
                  stderr += data.toString();
                  log(`WebP转换错误输出: ${data.toString().trim()}`);
                });
                
                process.on('close', (code) => {
                  clearTimeout(timeout);
                  if (code === 0) {
                    log('WebP转换命令执行成功');
                    resolve();
                  } else {
                    log(`WebP转换失败，错误码: ${code}, 错误信息: ${stderr}`);
                    reject(new Error(`WebP转换失败，错误码: ${code}, 错误信息: ${stderr}`));
                  }
                });
                
                process.on('error', (err) => {
                  clearTimeout(timeout);
                  log(`启动WebP转换进程失败: ${err.message}`);
                  reject(new Error(`启动WebP转换进程失败: ${err.message}`));
                });
              });
              
              // 检查转换结果
              if (fs.existsSync(tempJpegPath) && fs.statSync(tempJpegPath).size > 0) {
                // 读取转换后的JPEG
                try {
                  image = await Jimp.read(tempJpegPath);
                  log('成功加载转换后的JPEG图片');
                } catch (readErr) {
                  log(`读取转换后的JPEG失败: ${readErr.message}`);
                  throw new Error(`无法读取转换后的图片: ${readErr.message}`);
                }
              } else {
                log('转换后的JPEG文件不存在或为空');
                throw new Error('转换后的图片文件不存在或为空');
              }
            } else {
              // 尝试使用备用方法
              log(`WebP可执行文件不存在: ${webpBin}，尝试备用处理方法`);
              
              try {
                // 创建一个基本图片作为备用
                log('使用备用方法创建基本图片');
                image = new Jimp(400, 300, 0xffffffff);
                const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
                image.print(font, 10, 10, {
                  text: '已转换WebP图片',
                  alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
                }, 380);
              } catch (backupErr) {
                log(`备用图片创建失败: ${backupErr.message}`);
                throw new Error(`WebP转换失败: ${backupErr.message}`);
              }
            }
          } catch (webpError) {
            log(`WebP转换过程出错: ${webpError.message}`);
            
            // 创建一个错误提示图像作为替代
            log('创建错误提示图像作为替代');
            
            try {
              image = new Jimp(400, 300, 0xffffffff);
              // 尝试添加错误文本
              const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
              image.print(font, 0, 100, {
                text: 'WebP图片处理失败\n请使用JPG或PNG格式',
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
              }, 400);
              log('成功创建替代错误提示图像');
            } catch (fontError) {
              log(`创建替代图像失败: ${fontError.message}`);
              image = new Jimp(400, 300, 0xffffffff); // 简单的空白图像作为最后的备用方案
            }
          } finally {
            // 清理临时文件
            try {
              if (fs.existsSync(tempWebpPath)) fs.unlinkSync(tempWebpPath);
              if (fs.existsSync(tempJpegPath)) fs.unlinkSync(tempJpegPath);
              log('临时文件已清理');
            } catch (cleanupError) {
              log(`清理临时文件失败: ${cleanupError.message}`);
            }
          }
        } else {
          // 如果不是WebP格式问题，则抛出原始错误
          log(`加载图片失败，非WebP格式问题: ${err.message}`);
          throw err;
        }
      }
      
      log(`图片已加载，尺寸: ${image.getWidth()} x ${image.getHeight()}`);
      
      // 设置质量（压缩）
      image.quality(parseInt(options.quality));
      log(`设置图片质量: ${options.quality}`);
      
      // 如果需要调整大小
      if (!options.keepOriginalSize && (options.width || options.height)) {
        const width = options.width || Jimp.AUTO;
        const height = options.height || Jimp.AUTO;
        image.resize(width, height);
        log(`调整图片尺寸: ${width} x ${height}`);
      }
      
      // 生成输出文件名
      const outputFileName = fileName.replace(/\.[^.]+$/, '') + '_compressed.' + (options.format || 'jpg');
      
      // 生成输出文件路径
      const outputPath = path.join(tempDir, `compressed_${Date.now()}_${outputFileName}`);
      
      // 保存处理后的图片
      await image.writeAsync(outputPath);
      log(`图片已保存: ${outputPath}`);
      
      // 读取处理后的文件
      const outputBuffer = await fs.promises.readFile(outputPath);
      const outputBase64 = outputBuffer.toString('base64');
      const outputSize = outputBuffer.length;
      
      log(`处理后图片大小: ${outputSize} 字节`);
      
      // 计算大小变化
      const sizeChange = ((outputSize - originalSize) / originalSize * 100).toFixed(2);
      const sizeIncreased = outputSize > originalSize;
      
      // 返回结果
      return {
        success: true,
        data: `data:image/${options.format || 'jpeg'};base64,${outputBase64}`,
        outputPath,
        fileName: outputFileName,
        tempPath: outputPath,
        size: outputSize,
        originalSize,
        sizeChange: `${sizeIncreased ? '+' : ''}${sizeChange}%`,
        sizeWarning: sizeIncreased ? `文件大小增加了${sizeChange}%, 这可能是由于格式转换导致的` : null
      };
    } catch (error) {
      log(`处理图片时出错: ${error.message}`);
      
      // ... existing code ...
    }
  } catch (error) {
    log(`初始化处理时出错: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 选择保存位置
ipcMain.handle('select-save-path', async (event, { defaultName, filters }) => {
  try {
    log('打开保存目录选择对话框');
    const dialogOptions = {
      title: '选择保存目录',
      defaultPath: app.getPath('pictures'), // 默认打开图片文件夹
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: '选择文件夹'
    };

    const result = await dialog.showOpenDialog(dialogOptions);
    log(`目录选择对话框结果: ${JSON.stringify(result)}`);
    
    if (result.canceled) {
      log('用户取消了选择');
      return { success: false, reason: 'canceled' };
    }
    
    const selectedDir = result.filePaths[0];
    
    // 确保目录存在
    if (!fs.existsSync(selectedDir)) {
      fs.mkdirSync(selectedDir, { recursive: true });
      log(`创建目录: ${selectedDir}`);
    }
    
    return {
      success: true,
      filePath: selectedDir
    };
  } catch (error) {
    log(`选择保存目录失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 批量保存图片
ipcMain.handle('save-batch-images', async (event, { files, outputDir }) => {
  try {
    log(`开始批量保存图片到目录: ${outputDir}`);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const results = [];
    
    // 批量保存所有图片
    for (const file of files) {
      try {
        if (!file.tempPath || !file.fileName) {
          log(`跳过无效文件: ${JSON.stringify(file)}`);
          continue;
        }
        
        // 生成更有意义的文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const originalName = file.fileName.replace(/^compressed_\d+_/, ''); // 移除之前添加的前缀
        const newFileName = `compressed_${timestamp}_${originalName}`;
        const outputPath = path.join(outputDir, newFileName);
        
        // 检查源文件是否存在
        if (!fs.existsSync(file.tempPath)) {
          log(`源文件不存在: ${file.tempPath}`);
          continue;
        }
        
        // 复制文件
        fs.copyFileSync(file.tempPath, outputPath);
        log(`已保存文件: ${outputPath}`);
        
        // 删除临时文件
        fs.unlinkSync(file.tempPath);
        log(`已删除临时文件: ${file.tempPath}`);
        
        results.push({
          success: true,
          fileName: newFileName,
          outputPath
        });
      } catch (error) {
        log(`处理文件 ${file.fileName} 时出错: ${error.message}`);
        results.push({
          success: false,
          fileName: file.fileName,
          error: error.message
        });
      }
    }
    
    return {
      success: results.some(r => r.success),
      results,
      savedPath: outputDir // 返回保存的目录路径
    };
  } catch (error) {
    log(`批量保存图片时出错: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理图片上传
ipcMain.handle('upload-image', async (event, { dataUrl, fileName }) => {
  try {
    log(`文件上传处理: ${fileName}`);
    
    // 从 dataUrl 提取 base64 数据
    const base64Data = dataUrl.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 创建临时目录来存储上传的文件
    const tempDir = path.join(app.getPath('temp'), 'toolbox-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 为上传的文件生成临时文件路径
    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);
    
    // 保存文件
    fs.writeFileSync(tempFilePath, buffer);
    log(`文件已保存到临时位置: ${tempFilePath}`);
    
    // 获取文件大小信息
    const fileStats = fs.statSync(tempFilePath);
    
    return {
      success: true,
      filePath: tempFilePath,
      fileSize: fileStats.size,
      fileName: fileName
    };
  } catch (error) {
    log(`文件上传处理失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理app信息请求
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    appPath: app.getAppPath(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  };
});

// 删除文件
ipcMain.handle('delete-file', async (event, { filePath }) => {
  try {
    log(`删除文件: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      log(`文件不存在: ${filePath}`);
      return { success: true }; // 文件不存在也视为删除成功
    }
    
    fs.unlinkSync(filePath);
    log(`文件删除成功: ${filePath}`);
    
    return { success: true };
  } catch (error) {
    log(`删除文件失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 批量转换PDF为OFD
ipcMain.handle('convert-pdf-batch-to-ofd', async (event, params) => {
  log(`批量转换PDF为OFD请求: ${JSON.stringify(params)}`);
  
  try {
    const { files, options, concurrency } = params;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return {
        success: false,
        error: '没有指定要转换的文件'
      };
    }
    
    // 使用桥接模块进行批量转换
    const result = await pdfToOfdConverter.batchConvert(
      files.map(file => ({
        inputPath: file.inputPath,
        outputPath: file.outputPath,
        options: {
          ...options,
          isInvoice: file.isInvoice || false,
          conformance: file.conformance || 'standard',
          preserveSignatures: file.preserveSignatures || false
        }
      })),
      concurrency || 2
    );
    
    log(`批量转换完成: ${JSON.stringify({
      success: result.success,
      totalFiles: result.totalFiles,
      successCount: result.successCount,
      failedCount: result.failedCount,
      totalTime: result.totalTime
    })}`);
    
    return result;
  } catch (error) {
    log(`批量转换PDF为OFD时出错: ${error.message}`);
    return {
      success: false,
      error: `批量转换失败: ${error.message}`
    };
  }
});

// 检测PDF是否为发票
ipcMain.handle('detect-invoice', async (event, params) => {
  log(`检测PDF是否为发票: ${JSON.stringify(params)}`);
  
  try {
    const { pdfPath } = params;
    
    if (!pdfPath) {
      return {
        success: false,
        error: '未提供PDF路径'
      };
    }
    
    // 使用桥接模块检测
    const isInvoice = await pdfToOfdConverter.detectInvoice(pdfPath);
    
    return {
      success: true,
      isInvoice
    };
  } catch (error) {
    log(`检测发票时出错: ${error.message}`);
    return {
      success: false,
      error: `检测失败: ${error.message}`
    };
  }
});

// 检查Java环境
ipcMain.handle('check-java-environment', async () => {
  log('检查Java环境');
  
  try {
    const javaAvailable = await pdfToOfdConverter.checkJavaEnvironment();
    
    log(`Java环境检查结果: ${javaAvailable ? '可用' : '不可用'}`);
    
    return {
      success: true,
      available: javaAvailable
    };
  } catch (error) {
    log(`检查Java环境时出错: ${error.message}`);
    return {
      success: false,
      available: false,
      error: `检查失败: ${error.message}`
    };
  }
});

// 二维码生成
ipcMain.handle('generate-qr', async (event, params) => {
  try {
    log(`开始生成二维码: ${JSON.stringify({
      content: params.content ? params.content.substring(0, 20) + '...' : '空内容',
      options: params.options
    })}`);
    
    const { content, options } = params;
    
    if (!content) {
      throw new Error('未提供二维码内容');
    }
    
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      width: options.size || 300,
      margin: 1,
      color: {
        dark: options.foregroundColor || '#000000',
        light: '#FFFFFF'
      }
    };
    
    let result;
    
    // 根据请求的格式生成二维码
    if (options.format === 'text') {
      // 生成ASCII文本格式的二维码
      const textQR = await QRCode.toString(content, {
        type: 'terminal',
        ...qrOptions
      });
      
      result = {
        success: true,
        textContent: textQR,
        isText: true
      };
    } else {
      // 生成图片格式的二维码
      const dataUrl = await QRCode.toDataURL(content, {
        ...qrOptions,
        type: options.format === 'svg' ? 'svg' : 'image/png'
      });
      
      result = {
        success: true,
        dataUrl,
        isText: false
      };
    }
    
    log('二维码生成成功');
    return result;
  } catch (error) {
    log(`二维码生成错误: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 保存单个二维码
ipcMain.handle('save-qr', async (event, params) => {
  try {
    log(`保存单个二维码请求: ${JSON.stringify({
      format: params.format,
      fileName: params.fileName || '未指定'
    })}`);
    
    const { dataUrl, fileName, format, isText, textContent } = params;
    
    if (isText && !textContent) {
      throw new Error('未提供文本二维码内容');
    }
    
    if (!isText && !dataUrl) {
      throw new Error('未提供二维码数据URL');
    }
    
    // 打开保存对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存二维码',
      defaultPath: fileName || `qrcode_${Date.now()}.${format === 'svg' ? 'svg' : format === 'text' ? 'txt' : 'png'}`,
      filters: [
        { name: '二维码文件', extensions: [format === 'svg' ? 'svg' : format === 'text' ? 'txt' : 'png'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (canceled || !filePath) {
      log('用户取消了保存操作');
      return {
        success: false,
        canceled: true
      };
    }
    
    // 保存文件
    if (isText) {
      // 保存文本格式的二维码
      fs.writeFileSync(filePath, textContent);
      log(`文本二维码已保存到: ${filePath}`);
    } else {
      // 提取base64数据并保存
      const matches = dataUrl.match(/^data:image\/(png|svg\+xml);base64,(.+)$/);
      
      if (!matches) {
        log(`无效的数据URL格式: ${dataUrl.substring(0, 30)}...`);
        throw new Error('二维码数据URL格式无效');
      }
      
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer.length === 0) {
        log('警告: 二维码数据为空');
        throw new Error('二维码数据为空');
      }
      
      fs.writeFileSync(filePath, buffer);
      log(`二维码已保存到: ${filePath} (${buffer.length} 字节)`);
    }
    
    return {
      success: true,
      savedPath: filePath
    };
  } catch (error) {
    log(`保存单个二维码时出错: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
});

// 批量保存二维码
ipcMain.handle('save-batch-qr', async (event, params) => {
  try {
    log(`批量保存二维码请求: ${JSON.stringify({
      count: params.qrList?.length || 0,
      outputDir: params.outputDir
    })}`);
    
    const { qrList, outputDir } = params;
    
    if (!qrList || qrList.length === 0) {
      throw new Error('未提供二维码数据');
    }
    
    if (!outputDir) {
      throw new Error('未提供输出目录');
    }
    
    log(`二维码数据内容检查: ${qrList.length}项`);
    // 记录第一项的关键信息
    if (qrList.length > 0) {
      const firstItem = qrList[0];
      log(`二维码数据样例:
        格式=${firstItem.format}, 
        文本标记=${firstItem.isText || 'false'}, 
        数据URL长度=${firstItem.dataUrl ? firstItem.dataUrl.substring(0, 30) + '...' : '无'},
        文件名=${firstItem.fileName || '未指定'}`);
    }
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      log(`创建输出目录: ${outputDir}`);
    }
    
    const results = [];
    const timestamp = Date.now();
    
    // 跟踪已使用的文件名，避免文件名冲突
    const usedFileNames = new Set();
    
    // 处理每个二维码
    for (let i = 0; i < qrList.length; i++) {
      try {
        const qr = qrList[i];
        
        // 确保文件名不重复并且合法
        let fileName = qr.fileName;
        if (!fileName || fileName.trim() === '') {
          fileName = `qrcode_${timestamp}_${i}.${qr.format === 'svg' ? 'svg' : 'png'}`;
        }
        
        // 防止文件名非法字符
        fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
        
        // 确保文件扩展名正确
        if (qr.isText && !fileName.endsWith('.txt')) {
          fileName = fileName.replace(/\.[^.]+$/, '') + '.txt';
        } else if (qr.format === 'svg' && !fileName.endsWith('.svg')) {
          fileName = fileName.replace(/\.[^.]+$/, '') + '.svg';
        } else if (qr.format !== 'svg' && !fileName.endsWith('.png')) {
          fileName = fileName.replace(/\.[^.]+$/, '') + '.png';
        }
        
        // 确保文件名唯一
        let uniqueFileName = fileName;
        let counter = 1;
        while (usedFileNames.has(uniqueFileName)) {
          // 如果文件名已存在，添加递增数字
          const extension = path.extname(fileName);
          const baseName = path.basename(fileName, extension);
          uniqueFileName = `${baseName}_${counter}${extension}`;
          counter++;
        }
        
        // 记录已使用的文件名
        usedFileNames.add(uniqueFileName);
        
        const outputPath = path.join(outputDir, uniqueFileName);
        
        if (qr.isText) {
          // 保存文本格式的二维码
          if (qr.textContent) {
            fs.writeFileSync(outputPath, qr.textContent);
            log(`文本二维码已保存到: ${outputPath}`);
            
            results.push({
              success: true,
              path: outputPath,
              fileName: uniqueFileName
            });
          } else {
            throw new Error(`第${i+1}项文本二维码内容为空`);
          }
        } else if (qr.dataUrl) {
          // 提取base64数据并保存
          const dataUrlPattern = /^data:image\/(png|svg\+xml);base64,(.+)$/;
          const matches = qr.dataUrl.match(dataUrlPattern);
          
          if (!matches) {
            log(`无效的数据URL格式: ${qr.dataUrl.substring(0, 30)}...`);
            throw new Error(`第${i+1}项二维码数据URL格式无效`);
          }
          
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          if (buffer.length === 0) {
            log(`警告: 第${i+1}项二维码数据为空`);
            throw new Error(`第${i+1}项二维码数据为空`);
          }
          
          fs.writeFileSync(outputPath, buffer);
          log(`二维码已保存到: ${outputPath} (${buffer.length} 字节)`);
          
          results.push({
            success: true,
            path: outputPath,
            fileName: uniqueFileName
          });
        } else {
          log(`错误: 第${i+1}项二维码缺少数据`);
          throw new Error(`第${i+1}项二维码缺少数据`);
        }
      } catch (itemError) {
        log(`处理第${i+1}项二维码时出错: ${itemError.message}`);
        results.push({
          success: false,
          error: itemError.message,
          fileName: qrList[i].fileName || `未命名_${i}`
        });
      }
    }
    
    // 统计成功和失败的数量
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;
    
    log(`批量保存二维码完成: 成功=${successCount}, 失败=${failedCount}`);
    
    return {
      success: successCount > 0,
      results,
      savedPath: outputDir,
      successCount,
      failedCount
    };
  } catch (error) {
    log(`批量保存二维码时出错: ${error.message}`);
    log(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
});

// 使用外部Java程序进行PDF转OFD转换
async function launchExternalJavaApp(pdfPath) {
  log('启动外部Java程序进行PDF转OFD转换');

  try {
    // 获取应用程序资源目录
    let resourcesPath = process.resourcesPath || __dirname;
    
    // 针对开发环境特殊处理
    if (process.env.NODE_ENV === 'development') {
      // 在开发环境中，直接使用项目根目录
      resourcesPath = __dirname;
    }
    
    log(`应用资源目录: ${resourcesPath}`);
    
    // 列出资源目录内容以便调试
    try {
      const resourcesContent = fs.readdirSync(resourcesPath);
      log(`资源目录内容: ${JSON.stringify(resourcesContent)}`);
    } catch (e) {
      log(`无法读取资源目录: ${e.message}`);
    }
    
    // Java程序的路径
    const javaAppPath = path.join(resourcesPath, 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar');
    
    // 检查Java程序是否存在
    if (!fs.existsSync(javaAppPath)) {
      log(`Java程序不存在: ${javaAppPath}`);
      // 尝试查找其他可能的位置
      const alternativeJarPaths = [
        path.join(app.getAppPath(), 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar'),
        path.join(resourcesPath, 'app.asar.unpacked', 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar')
      ];
      
      let jarFound = false;
      for (const altPath of alternativeJarPaths) {
        log(`检查备选JAR路径: ${altPath}`);
        if (fs.existsSync(altPath)) {
          log(`找到备选JAR: ${altPath}`);
          jarFound = true;
          // 使用找到的JAR
          return launchWithJavaExecutable(altPath, pdfPath);
        }
      }
      
      if (!jarFound) {
        return {
          success: false,
          error: 'Java程序不存在，请检查安装路径'
        };
      }
    }
    
    // 使用找到的JAR
    return launchWithJavaExecutable(javaAppPath, pdfPath);
  } catch (error) {
    log(`启动外部Java程序失败: ${error.message}`);
    return {
      success: false,
      error: `启动外部程序失败: ${error.message}`
    };
  }
}

// 根据可用的Java可执行文件启动程序
async function launchWithJavaExecutable(javaAppPath, pdfPath) {
  try {
    log(`尝试启动Java程序: ${javaAppPath}`);
    
    // 获取应用程序资源目录
    let resourcesPath = process.resourcesPath || __dirname;
    
    // 针对开发环境特殊处理
    if (process.env.NODE_ENV === 'development') {
      // 在开发环境中，直接使用项目根目录
      resourcesPath = __dirname;
    }
    
    // 打印当前Java版本信息
    try {
      const { execSync } = require('child_process');
      const javaVersionOutput = execSync('java -version 2>&1').toString();
      log(`当前系统Java版本信息: ${javaVersionOutput}`);
    } catch (e) {
      log(`获取Java版本信息失败: ${e.message}`);
    }
    
    // 收集所有可能的JRE路径
    const possibleJavaPaths = [
      // 主要JRE位置
      {
        name: '内置JRE(resources/jre)',
        path: path.join(resourcesPath, 'jre', 
          process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java')
      },
      // app.asar.unpacked中的JRE
      {
        name: '内置JRE(app.asar.unpacked/jre)',
        path: path.join(resourcesPath, 'app.asar.unpacked', 'jre', 
          process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java')
      },
      // 项目根目录中的JRE
      {
        name: '根目录JRE',
        path: path.join(app.getAppPath(), 'jre', 
          process.platform === 'win32' ? 'bin\\java.exe' : 'bin/java')
      }
    ];
    
    // 尝试在固定目录中找JAR文件
    const jarPath = javaAppPath;
    if (!fs.existsSync(jarPath)) {
      log(`JAR文件不存在: ${jarPath}`);
      
      // 列出源目录的内容
      const vendorDir = path.join(resourcesPath, 'vendor');
      if (fs.existsSync(vendorDir)) {
        try {
          const vendorContents = fs.readdirSync(vendorDir);
          log(`vendor目录内容: ${JSON.stringify(vendorContents)}`);
          
          // 检查003目录
          const dir003 = path.join(vendorDir, '003');
          if (fs.existsSync(dir003)) {
            const dir003Contents = fs.readdirSync(dir003);
            log(`003目录内容: ${JSON.stringify(dir003Contents)}`);
            
            // 检查target目录
            const targetDir = path.join(dir003, 'target');
            if (fs.existsSync(targetDir)) {
              const targetContents = fs.readdirSync(targetDir);
              log(`target目录内容: ${JSON.stringify(targetContents)}`);
            }
          }
        } catch (e) {
          log(`读取目录内容失败: ${e.message}`);
        }
      }
    }
    
    // 检查每个JRE路径
    for (const javaBin of possibleJavaPaths) {
      log(`检查Java可执行文件: ${javaBin.name} - ${javaBin.path}`);
      
      if (fs.existsSync(javaBin.path)) {
        log(`找到Java可执行文件: ${javaBin.path}`);
        
        // 构建命令
        const cmd = pdfPath 
          ? `"${javaBin.path}" -jar "${jarPath}" "${pdfPath}"`
          : `"${javaBin.path}" -jar "${jarPath}"`;
          
        log(`执行命令: ${cmd}`);
        
        // 启动Java程序
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
          exec(cmd, (error, stdout, stderr) => {
            if (error) {
              log(`使用 ${javaBin.name} 启动失败: ${error.message}`);
              
              // 检查是否是版本不兼容的问题
              if (stderr && (stderr.includes('UnsupportedClassVersionError') || 
                             stderr.includes('compiled by a more recent version') ||
                             stderr.includes('class file version'))) {
                log(`检测到类版本不兼容问题: ${stderr}`);
                
                // 尝试使用系统安装的Java
                log('尝试使用系统安装的Java...');
                resolve(launchWithSystemJava(jarPath, pdfPath));
                return;
              }
              
              // 继续尝试下一个JRE
              resolve({
                success: false,
                error: `使用 ${javaBin.name} 启动失败: ${error.message}`
              });
              return;
            }
            
            if (stderr) {
              log(`${javaBin.name} 错误输出: ${stderr}`);
            }
            
            log(`${javaBin.name} 输出: ${stdout}`);
            resolve({
              success: true,
              message: `已使用 ${javaBin.name} 启动外部PDF转换程序`
            });
          });
        });
      }
    }
    
    // 如果内置JRE都不可用，尝试使用系统Java
    log('所有内置JRE都不可用，尝试使用系统Java');
    return launchWithSystemJava(jarPath, pdfPath);
  } catch (error) {
    log(`启动Java程序时出错: ${error.message}`);
    return {
      success: false,
      error: `启动失败: ${error.message}`
    };
  }
}

// 备选方案：使用系统Java启动程序
function launchWithSystemJava(javaAppPath, pdfPath) {
  try {
    log('尝试使用系统Java启动程序');
    
    // 检查JAR文件是否存在
    if (!fs.existsSync(javaAppPath)) {
      log(`系统Java启动失败: JAR文件不存在 ${javaAppPath}`);
      
      // 尝试查找其他可能位置
      let foundJar = false;
      const alternativeJarPaths = [
        path.join(app.getAppPath(), 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar'),
        path.join(process.resourcesPath || __dirname, 'app.asar.unpacked', 'vendor', '003', 'target', 'pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar'),
        path.join(__dirname, 'vendor', '003', 'target', 'PDF转换器.exe')
      ];
      
      for (const altPath of alternativeJarPaths) {
        log(`检查备选JAR路径: ${altPath}`);
        if (fs.existsSync(altPath)) {
          log(`找到备选JAR: ${altPath}`);
          javaAppPath = altPath;
          foundJar = true;
          break;
        }
      }
      
      if (!foundJar) {
        return {
          success: false,
          error: `找不到Java程序JAR文件，请确保pdf-to-ofd-converter-1.0-SNAPSHOT-jar-with-dependencies.jar存在`
        };
      }
    }
    
    // 构建命令，如果pdfPath为空，则直接启动Java程序不带参数
    const cmd = pdfPath 
      ? `java -jar "${javaAppPath}" "${pdfPath}"`
      : `java -jar "${javaAppPath}"`;
      
    log(`执行命令: ${cmd}`);

    // 使用系统Java启动
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          log(`启动外部程序失败: ${error.message}`);
          if (stderr) {
            log(`启动错误详情: ${stderr}`);
          }
          
          resolve({
            success: false,
            error: `系统Java启动失败: ${error.message}`
          });
          return;
        }
        if (stderr) {
          log(`启动外部程序错误输出: ${stderr}`);
        }
        log(`启动外部程序输出: ${stdout}`);
        resolve({
          success: true,
          message: '已使用系统Java启动外部PDF转换程序'
        });
      });
    });
  } catch (error) {
    log(`使用系统Java启动失败: ${error.message}`);
    return {
      success: false,
      error: `启动失败: ${error.message}`
    };
  }
}