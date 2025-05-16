import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Card, List } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Support: React.FC = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: '如何使用PDF转换功能？',
      answer: '在PDF工具页面，选择需要的转换格式（Word、Excel、PPT等），然后将PDF文件拖拽到上传区域或点击选择文件。系统会自动开始转换，完成后可以下载转换后的文件。'
    },
    {
      question: '图片压缩后质量如何？',
      answer: '我们使用智能压缩算法，在保证视觉效果的同时最大程度减小文件体积。您可以通过调节压缩质量（0-100%）来平衡图片质量和文件大小。'
    },
    {
      question: '支持哪些图片格式？',
      answer: '目前支持最常用的图片格式：JPG、PNG、WebP。您可以在压缩时选择输出格式，方便跨平台使用。'
    },
    {
      question: '二维码支持什么内容？',
      answer: '支持URL链接、纯文本内容、vCard名片等格式。生成的二维码可以自定义大小、颜色，并支持导出为PNG或SVG格式。'
    }
  ];

  const contactInfo = {
    email: 'support@toolbox.com',
    website: 'https://www.toolbox.com',
    github: 'https://github.com/toolbox'
  };

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        type="link" 
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24 }}
      >
        返回
      </Button>

      <Title level={2} style={{ textAlign: 'center', marginBottom: 48 }}>
        帮助与支持
      </Title>

      <Card title="常见问题" style={{ marginBottom: 32 }}>
        <List
          dataSource={faqs}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={item.question}
                description={item.answer}
              />
            </List.Item>
          )}
        />
      </Card>

      <Card title="联系我们">
        <Paragraph>
          如果您在使用过程中遇到任何问题，或有任何建议，请通过以下方式联系我们：
        </Paragraph>
        <List>
          <List.Item>
            <strong>邮箱：</strong> {contactInfo.email}
          </List.Item>
          <List.Item>
            <strong>官网：</strong> {contactInfo.website}
          </List.Item>
          <List.Item>
            <strong>GitHub：</strong> {contactInfo.github}
          </List.Item>
        </List>
      </Card>
    </div>
  );
};

export default Support; 