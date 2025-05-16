const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function log(message) {
  console.log(message);
  fs.appendFileSync(path.join(__dirname, 'test-log.txt'), message + '\n');
}

process.on('uncaughtException', (error) => {
  log(`未捕获的异常: ${error.message}`);
  log(error.stack);
});

function createWindow() {
  log('创建测试窗口');
  
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
  
  const htmlPath = path.join(__dirname, 'static-index.html');
  log(`加载静态HTML文件: ${htmlPath}`);
  
  try {
    mainWindow.loadFile(htmlPath);
    mainWindow.webContents.openDevTools();
  } catch (err) {
    log(`加载文件错误: ${err.message}`);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('页面加载完成');
    
    mainWindow.webContents.executeJavaScript(`
      document.body ? document.body.innerHTML.substring(0, 100) : 'body不存在'
    `).then(content => {
      log(`页面内容片段: ${content}`);
    }).catch(err => {
      log(`无法读取页面内容: ${err.message}`);
    });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`页面加载失败: ${errorCode} - ${errorDescription}`);
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