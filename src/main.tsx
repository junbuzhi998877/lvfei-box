import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

console.log('main.tsx 文件被执行');

// 错误边界
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('React 渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{padding: '20px', color: 'red'}}>应用加载失败，请检查控制台错误信息。</div>;
    }

    return this.props.children;
  }
}

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('找不到 root 元素');
  }
  
  console.log('找到 root 元素，开始渲染 React');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  console.log('React 渲染完成');
} catch (error) {
  console.error('React 初始化错误:', error);
} 