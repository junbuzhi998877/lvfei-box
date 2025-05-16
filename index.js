const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

function log(message) {
  console.log(message);
  fs.appendFileSync(path.join(__dirname, 'app-log.txt'), message + '\n');
}

process.on('uncaughtException', (error) => {
  log(`未捕获的异常: ${error.message}`);
  log(error.stack);
});

function createWindow() {
  log('创建主窗口');
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: true
    }
  });
  
  if (isDev) {
    // 开发环境：优先尝试加载静态HTML，如果失败再尝试Vite服务
    const staticHtmlPath = path.join(__dirname, 'static-index.html');
    
    if (fs.existsSync(staticHtmlPath)) {
      log(`加载静态HTML文件: ${staticHtmlPath}`);
      mainWindow.loadFile(staticHtmlPath);
    } else {
      const url = 'http://127.0.0.1:5177';
      log(`加载开发服务器: ${url}`);
      mainWindow.loadURL(url);
    }
    
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    const filePath = path.join(__dirname, 'dist', 'index.html');
    log(`加载生产文件: ${filePath}`);
    mainWindow.loadFile(filePath);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('页面加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`页面加载失败: ${errorCode} - ${errorDescription}`);
    
    // 尝试加载备用HTML
    const backupHtml = path.join(__dirname, 'static-index.html');
    if (fs.existsSync(backupHtml)) {
      log(`尝试加载备用HTML: ${backupHtml}`);
      mainWindow.loadFile(backupHtml);
    }
  });
  
  mainWindow.webContents.on('console-message', (event, level, message) => {
    log(`渲染进程控制台 [${level}]: ${message}`);
  });
}

app.whenReady().then(() => {
  log('Electron应用已就绪');
  createWindow();
}).catch(err => {
  log(`应用启动错误: ${err.message}`);
});

app.on('window-all-closed', () => {
  log('所有窗口已关闭');
  app.quit();
}); 