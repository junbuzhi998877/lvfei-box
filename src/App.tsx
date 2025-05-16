import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import PdfTools from './pages/PdfTools';
import ImageTools from './pages/ImageTools';
import QrCode from './pages/QrCode';
import QrCodeBatch from './pages/QrCodeBatch';
import Support from './pages/Support';
import './styles/App.css';

/**
 * 应用程序主组件
 * 集成了Electron环境检测
 */
const App: React.FC = () => {
  const [appReady, setAppReady] = useState(false);
  const [electronInfo, setElectronInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 处理菜单操作
  const handleMenuAction = useCallback((action: string | {action: string, [key: string]: any}) => {
    console.log(`接收到菜单操作:`, action);
    
    // 处理对象类型的操作
    if (typeof action === 'object') {
      const { action: actionType, ...rest } = action;
      
      switch (actionType) {
        case 'search-text':
          console.log(`搜索文本: ${rest.text}`);
          // 可以打开浏览器搜索，或者在应用内搜索
          if (rest.text && window.confirm(`要搜索 "${rest.text}" 吗？`)) {
            window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(rest.text)}`, '_blank');
          }
          break;
          
        case 'save-image':
          console.log(`保存图片: ${rest.src}`);
          // 处理图片保存逻辑
          if (rest.src && window.electronAPI?.selectSavePath) {
            // 提取文件名
            const fileName = rest.src.split('/').pop() || 'image.png';
            
            // 向Electron发送保存请求
            window.electronAPI.selectSavePath({ defaultName: fileName })
              .then(result => {
                if (result.success && result.filePath) {
                  // 这里可以实现图片保存逻辑
                  console.log(`保存图片到: ${result.filePath}`);
                }
              })
              .catch(err => console.error('保存图片失败:', err));
          }
          break;
          
        case 'copy-image':
          console.log(`复制图片: ${rest.src}`);
          // 这需要Electron端的支持，可以使用clipboard模块
          break;
          
        default:
          console.log(`未处理的对象操作: ${actionType}`);
      }
      
      return;
    }
    
    // 处理字符串类型的操作
    switch (action) {
      case 'new-workspace':
        // 重置应用状态，导航到首页
        navigate('/');
        break;
        
      case 'save':
        // 根据当前页面路径执行不同的保存逻辑
        if (location.pathname.includes('/pdf')) {
          console.log('执行PDF工具保存操作');
          // 调用PDF相关的保存功能
        } else if (location.pathname.includes('/image')) {
          console.log('执行图片工具保存操作');
          // 调用图片相关的保存功能
        } else if (location.pathname.includes('/qrcode')) {
          console.log('执行二维码工具保存操作');
          // 调用二维码相关的保存功能
        }
        break;
        
      case 'save-as':
        // 类似保存，但需要显示保存对话框
        console.log('执行另存为操作');
        break;
        
      case 'check-update':
        console.log('检查更新');
        // 实现检查更新逻辑
        break;
        
      case 'go-home':
        console.log('返回首页');
        navigate('/');
        break;
        
      default:
        console.log(`未处理的菜单操作: ${action}`);
    }
  }, [location.pathname, navigate]);
  
  // 处理文件打开
  const handleFileOpened = useCallback((fileInfo: {path: string}) => {
    console.log(`接收到文件打开事件: ${fileInfo.path}`);
    
    // 根据文件扩展名决定导航到哪个工具页面
    const extension = fileInfo.path.split('.').pop()?.toLowerCase();
    if (extension) {
      if (extension === 'pdf') {
        navigate('/pdf');
        // 在导航完成后，可以将文件信息传递给PDF工具组件
        sessionStorage.setItem('openFile', JSON.stringify(fileInfo));
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        navigate('/image');
        // 在导航完成后，可以将文件信息传递给图片工具组件
        sessionStorage.setItem('openFile', JSON.stringify(fileInfo));
      }
    }
  }, [navigate]);
  
  useEffect(() => {
    // 调试信息 - 应用初始化
    console.log('====== 应用初始化开始 ======');
    console.log('App 组件已加载');
    console.log('当前路径:', location.pathname);
    
    // 强制初始化完成的标志和计时器
    let forceInitTimer: NodeJS.Timeout | null = null;
    
    // 检测是否在Electron环境中运行
    try {
      const api = window.electronAPI;
      console.log('检测electronAPI:', api ? '存在' : '不存在');
      
      if (api) {
        console.log('检测到Electron环境，正在获取信息...');
        
        // 调试信息 - API方法
        const apiMethods = Object.keys(api);
        console.log('可用API方法:', apiMethods);
        
        // 尝试注册菜单操作和文件打开的监听器
        let menuUnsubscribe: (() => void) | undefined;
        let fileOpenedUnsubscribe: (() => void) | undefined;
        
        try {
          if (typeof api.onMenuAction === 'function') {
            menuUnsubscribe = api.onMenuAction(handleMenuAction);
            console.log('菜单操作监听器注册成功');
          } else {
            console.warn('onMenuAction 不是一个函数，类型:', typeof api.onMenuAction);
          }
          
          if (typeof api.onFileOpened === 'function') {
            fileOpenedUnsubscribe = api.onFileOpened(handleFileOpened);
            console.log('文件打开监听器注册成功');
          } else {
            console.warn('onFileOpened 不是一个函数，类型:', typeof api.onFileOpened);
          }
        } catch (evtError: any) {
          console.error('注册事件监听器失败:', evtError);
        }
        
        try {
          // 使用Promise处理异步调用
          console.log('正在获取应用信息...');
          api.getAppInfo()
            .then((info) => {
              console.log('获取Electron环境信息成功:', info);
              setElectronInfo(info);
            })
            .catch((err) => {
              console.error('获取Electron信息失败:', err);
              setErrorMessage(`获取Electron信息失败: ${err.message || '未知错误'}`);
            })
            .finally(() => {
              // 无论如何都标记应用为就绪
              console.log('应用信息获取结束，设置应用为就绪状态');
              setAppReady(true);
            });
        } catch (apiError: any) {
          console.error('调用Electron API失败:', apiError);
          setErrorMessage(`Electron API调用失败: ${apiError.message || '未知错误'}`);
          // 出错时也标记应用为就绪
          setAppReady(true);
        }
        
        // 组件卸载时清理事件监听
        return () => {
          if (forceInitTimer) clearTimeout(forceInitTimer);
          if (menuUnsubscribe) menuUnsubscribe();
          if (fileOpenedUnsubscribe) fileOpenedUnsubscribe();
          console.log('应用组件卸载，清理资源');
        };
      } else {
        console.log('未检测到Electron环境，可能在浏览器中运行');
        // 在浏览器环境中直接标记为就绪
        setAppReady(true);
      }
    } catch (error: any) {
      console.error('获取Electron信息失败:', error);
      setErrorMessage('无法连接到Electron API，请确保应用正确启动');
      // 出错时也标记应用为就绪
      setAppReady(true);
    }
    
    // 强制超时处理 - 最多等待3秒，然后强制显示界面
    forceInitTimer = setTimeout(() => {
      console.log('应用初始化超时，强制显示界面');
      if (!appReady) {
        setAppReady(true);
      }
    }, 3000);
    
    // 调试信息 - 初始化结束
    console.log('====== 应用初始化请求完成 ======');
  }, [location.pathname, handleMenuAction, handleFileOpened]);
  
  // 当应用准备好时发送日志
  useEffect(() => {
    if (appReady) {
      console.log('====== 应用已准备就绪 ======');
    }
  }, [appReady]);
  
  // 显示加载界面或错误信息
  if (!appReady) {
    return (
      <div className="loading-screen">
        <h2>应用加载中...</h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">工具箱</div>
        <nav className="main-nav">
          <ul>
            <li><Link to="/">首页</Link></li>
            <li><Link to="/pdf">PDF工具</Link></li>
            <li><Link to="/image">图片工具</Link></li>
            <li><Link to="/qrcode">二维码</Link></li>
            <li><Link to="/qrcode/batch">二维码批量生成</Link></li>
            <li><Link to="/support">支持</Link></li>
          </ul>
        </nav>
      </header>
      
      <main className="content">
        {electronInfo && (
          <div className="electron-info">
            运行于 Electron {electronInfo.version} ({electronInfo.platform})
          </div>
        )}
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pdf" element={<PdfTools />} />
          <Route path="/image" element={<ImageTools />} />
          <Route path="/qrcode" element={<QrCode />} />
          <Route path="/qrcode/batch" element={<QrCodeBatch />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={
            <div className="placeholder-page">
              <h2>页面不存在</h2>
              <p>当前路径: {location.pathname}</p>
              <p>请从上方菜单选择页面</p>
            </div>
          } />
        </Routes>
      </main>
      
      <footer className="footer">
        <p>工具箱应用 &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

// 为 TypeScript 添加全局 window 的类型扩展
declare global {
  interface Window {
    electronAPI?: {
      getAppInfo: () => Promise<any>;
      convertPDF: (options: any) => Promise<any>;
      convertPDFBatch: (options: any) => Promise<any>;
      convertPDFBatchToOFD: (options: any) => Promise<any>;
      compressImage: (options: any) => Promise<any>;
      processImage: (options: any) => Promise<any>;
      generateQR: (options: any) => Promise<any>;
      saveQR: (options: any) => Promise<any>;
      saveBatchQR: (options: any) => Promise<any>;
      detectInvoice: (options: any) => Promise<any>;
      checkJavaEnvironment: () => Promise<any>;
      uploadImage: (options: any) => Promise<any>;
      selectSavePath: (options: any) => Promise<any>;
      saveBatchImages: (options: any) => Promise<any>;
      deleteFile: (filePath: string) => Promise<any>;
      onMenuAction?: (callback: (action: string | {action: string, [key: string]: any}) => void) => (() => void);
      onFileOpened?: (callback: (fileInfo: {path: string}) => void) => (() => void);
    };
  }
}

export default App; 