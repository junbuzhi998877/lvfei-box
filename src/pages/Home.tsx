import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 首页组件 - 提供工具箱主要功能的导航
 */
const Home: React.FC = () => {
  // 工具列表
  const tools = [
    {
      key: 'pdf',
      title: 'PDF格式转换',
      icon: 'PDF',
      iconClass: 'pdf',
      description: '轻松转换PDF至Word、Excel、PPT等格式，或将其他格式转为PDF。',
      path: '/pdf'
    },
    {
      key: 'image',
      title: '图片压缩工具',
      icon: 'IMG',
      iconClass: 'image',
      description: '高质量图片压缩，减小文件体积但保持视觉效果。批量处理更高效。',
      path: '/image'
    },
    {
      key: 'qrcode',
      title: '二维码生成',
      icon: 'QR',
      iconClass: 'qrcode',
      description: '快速生成自定义二维码，支持多种格式和样式。',
      path: '/qrcode'
    }
  ];

  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>多功能工具箱</h1>
        <p className="subtitle">简单高效的桌面实用工具集</p>
      </section>

      <section className="tools-section">
        <div className="tools-grid">
          {tools.map(tool => (
            <div key={tool.key} className="tool-card">
              <div className={`tool-icon ${tool.iconClass}`}>
                {tool.icon}
              </div>
              <h2 className="tool-title">{tool.title}</h2>
              <p className="tool-description">{tool.description}</p>
              <Link to={tool.path} className="primary-button">
                开始使用
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <h2>为什么选择我们的工具箱？</h2>
        <div className="features-grid">
          <div className="feature-item">
            <h3>🚀 高效处理</h3>
            <p>所有工具均采用优化算法，确保快速处理文件</p>
          </div>
          <div className="feature-item">
            <h3>🔒 本地运行</h3>
            <p>所有处理在本地完成，保护您的数据安全</p>
          </div>
          <div className="feature-item">
            <h3>🔄 批量处理</h3>
            <p>支持多文件批量操作，提高工作效率</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 