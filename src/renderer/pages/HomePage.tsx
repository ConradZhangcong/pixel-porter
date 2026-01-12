import { useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Button } from 'antd';
import {
  FileTextOutlined,
  PictureOutlined,
  CopyOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import './HomePage.css';

const { Title, Paragraph } = Typography;

function HomePage() {
  const navigate = useNavigate();

  const handleFeatureClick = (feature: string) => {
    // TODO: 导航到对应的功能页面
    console.log(`Navigate to ${feature}`);
  };

  return (
    <div className="home-page">
      {/* 顶部标题栏 */}
      <header className="home-header">
        <div className="header-content">
          <Title level={2} className="app-title">
            Pixel Porter
          </Title>
          <Space className="header-actions">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => console.log('Settings')}
            >
              设置
            </Button>
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => console.log('Help')}
            >
              帮助
            </Button>
          </Space>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="home-content">
        {/* 欢迎区域 */}
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="app-icon">📷</div>
            <Title level={1} className="welcome-title">
              Pixel Porter
            </Title>
            <Paragraph className="welcome-subtitle">
              图片处理管理工具
            </Paragraph>
          </div>
        </div>

        {/* 功能卡片区域 */}
        <div className="features-section">
          <Space size="large" className="feature-cards">
            <Card
              className="feature-card"
              hoverable
              onClick={() => handleFeatureClick('rename')}
            >
              <div className="feature-icon">
                <FileTextOutlined />
              </div>
              <Title level={4} className="feature-title">
                文件重命名
              </Title>
              <Paragraph className="feature-description">
                批量修改图片文件名称
              </Paragraph>
            </Card>

            <Card
              className="feature-card"
              hoverable
              onClick={() => handleFeatureClick('watermark')}
            >
              <div className="feature-icon">
                <PictureOutlined />
              </div>
              <Title level={4} className="feature-title">
                添加水印
              </Title>
              <Paragraph className="feature-description">
                根据EXIF信息创建水印版本
              </Paragraph>
            </Card>

            <Card
              className="feature-card"
              hoverable
              onClick={() => handleFeatureClick('exif-copy')}
            >
              <div className="feature-icon">
                <CopyOutlined />
              </div>
              <Title level={4} className="feature-title">
                EXIF复制
              </Title>
              <Paragraph className="feature-description">
                复制EXIF信息到目标图片
              </Paragraph>
            </Card>
          </Space>
        </div>

        {/* 最近使用的模板 */}
        <div className="templates-section">
          <Card className="templates-card" title="最近使用的模板">
            <Space>
              <Card size="small" className="template-item">
                模板1
              </Card>
              <Card size="small" className="template-item">
                模板2
              </Card>
              <Card size="small" className="template-item">
                模板3
              </Card>
            </Space>
          </Card>
        </div>

        {/* 快速开始提示 */}
        <div className="quick-start-section">
          <Card className="quick-start-card">
            <Title level={5}>快速开始</Title>
            <ul className="quick-start-list">
              <li>选择功能模块开始处理图片</li>
              <li>查看帮助文档了解详细功能</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default HomePage;

