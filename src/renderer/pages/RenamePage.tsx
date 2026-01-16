import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Table,
  Radio,
  Input,
  Checkbox,
  Select,
  Progress,
  message,
  Tag,
  Alert,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileOutlined,
  FolderOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  FileInfo,
  NamingRuleConfig,
  RenamePreviewItem,
  ProcessProgress,
  ProcessResult,
} from '../../shared/types';
import './RenamePage.css';

const { Option } = Select;

function RenamePage() {
  const navigate = useNavigate();

  // 状态管理
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [previews, setPreviews] = useState<RenamePreviewItem[]>([]);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  // 配置状态
  const [config, setConfig] = useState<NamingRuleConfig>({
    rule: 'exif-date',
    dateFormat: 'YYYYMMDD_HHMMSS',
    separator: '_',
    combinationTemplate: '{date}_{time}_{original}',
    autoIndex: true,
    maxLength: 50,
  });

  const [recursive, setRecursive] = useState(false);
  const [backup, setBackup] = useState(false);
  const [backupDir, setBackupDir] = useState('');

  // 选择文件
  const handleSelectFiles = async () => {
    try {
      const filePaths = await window.electronAPI.selectFiles();
      if (filePaths.length > 0) {
        const fileInfos = await window.electronAPI.renameGetFilesInfo(
          filePaths
        );
        setFiles(fileInfos.map((f: any) => ({
          ...f,
          createTime: f.createTime ? new Date(f.createTime) : undefined,
          modifyTime: f.modifyTime ? new Date(f.modifyTime) : undefined,
        })));
        setPreviews([]);
        setResult(null);
      }
    } catch (error: any) {
      message.error(`选择文件失败: ${error.message}`);
    }
  };

  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const folderPaths = await window.electronAPI.selectFolder();
      if (folderPaths.length > 0) {
        const folderPath = folderPaths[0];
        const fileInfos = await window.electronAPI.renameScanFolder(
          folderPath,
          recursive
        );
        setFiles(fileInfos.map((f: any) => ({
          ...f,
          createTime: f.createTime ? new Date(f.createTime) : undefined,
          modifyTime: f.modifyTime ? new Date(f.modifyTime) : undefined,
        })));
        setPreviews([]);
        setResult(null);
      }
    } catch (error: any) {
      message.error(`选择文件夹失败: ${error.message}`);
    }
  };

  // 生成预览
  const handleGeneratePreview = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    try {
      message.loading({ content: '正在生成预览...', key: 'preview' });
      const previewResult = await window.electronAPI.renameGeneratePreview(
        files,
        config
      );
      setPreviews(previewResult.previews);
      setHasConflicts(previewResult.hasConflicts);
      message.success({ content: '预览生成成功', key: 'preview' });
    } catch (error: any) {
      message.error({ content: `生成预览失败: ${error.message}`, key: 'preview' });
    }
  };

  // 执行重命名
  const handleExecuteRename = async () => {
    if (previews.length === 0) {
      message.warning('请先生成预览');
      return;
    }

    Modal.confirm({
      title: '确认重命名',
      content: `确定要重命名 ${previews.length} 个文件吗？`,
      onOk: async () => {
        setIsProcessing(true);
        setProgress(null);
        setResult(null);

        // 监听进度
        window.electronAPI.onRenameProgress((progressData: ProcessProgress) => {
          setProgress(progressData);
        });

        try {
          const renameResult = await window.electronAPI.renameExecute(
            previews,
            {
              backup,
              backupDir: backupDir || undefined,
            }
          );

          setResult(renameResult);
          setIsProcessing(false);
          window.electronAPI.offRenameProgress();

          if (renameResult.failed === 0) {
            message.success('重命名完成！');
          } else {
            message.warning(
              `重命名完成，但有 ${renameResult.failed} 个文件失败`
            );
          }
        } catch (error: any) {
          setIsProcessing(false);
          window.electronAPI.offRenameProgress();
          message.error(`重命名失败: ${error.message}`);
        }
      },
    });
  };

  // 取消处理
  const handleCancel = () => {
    window.electronAPI.renameCancel();
    setIsProcessing(false);
    message.info('已取消处理');
  };

  // 移除文件
  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews([]);
  };

  // 预览表格列
  const previewColumns = [
    {
      title: '原文件名',
      dataIndex: 'fileInfo',
      key: 'original',
      render: (fileInfo: FileInfo) => fileInfo.name,
    },
    {
      title: '新文件名',
      dataIndex: 'newName',
      key: 'newName',
    },
    {
      title: '状态',
      dataIndex: 'hasConflict',
      key: 'status',
      render: (hasConflict: boolean, record: RenamePreviewItem) => {
        if (hasConflict) {
          return (
            <Tag color="warning">
              ⚠ 冲突: {record.conflictReason}
            </Tag>
          );
        }
        return <Tag color="success">✓ 正常</Tag>;
      },
    },
  ];

  return (
    <div className="rename-page">
      {/* 顶部导航栏 */}
      <div className="page-header">
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
          >
            返回
          </Button>
          <h2>文件重命名</h2>
        </Space>
      </div>

      <div className="page-content">
        {/* 步骤 1: 选择文件 */}
        <Card title="步骤 1: 选择文件" className="step-card">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space>
              <Button
                type="primary"
                icon={<FileOutlined />}
                onClick={handleSelectFiles}
              >
                选择文件
              </Button>
              <Button
                icon={<FolderOutlined />}
                onClick={handleSelectFolder}
              >
                选择文件夹
              </Button>
            </Space>

            <Checkbox
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
            >
              递归处理子文件夹
            </Checkbox>

            {files.length > 0 && (
              <div>
                <p>已选择文件: {files.length} 个</p>
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <span>{file.name}</span>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleRemoveFile(index)}
                      >
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Space>
        </Card>

        {/* 步骤 2: 配置命名规则 */}
        <Card title="步骤 2: 配置命名规则" className="step-card">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <label>命名规则:</label>
              <Radio.Group
                value={config.rule}
                onChange={(e) =>
                  setConfig({ ...config, rule: e.target.value })
                }
                style={{ marginTop: 8 }}
              >
                <Radio value="exif-date">基于EXIF拍摄时间</Radio>
                <Radio value="file-date">基于文件创建时间</Radio>
                <Radio value="original">基于原始文件名</Radio>
                <Radio value="combination">组合命名规则</Radio>
              </Radio.Group>
            </div>

            {(config.rule === 'exif-date' || config.rule === 'file-date') && (
              <>
                <div>
                  <label>日期时间格式:</label>
                  <Select
                    value={config.dateFormat}
                    onChange={(value) =>
                      setConfig({ ...config, dateFormat: value })
                    }
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value="YYYYMMDD_HHMMSS">YYYYMMDD_HHMMSS</Option>
                    <Option value="YYYY-MM-DD_HH-MM-SS">
                      YYYY-MM-DD_HH-MM-SS
                    </Option>
                    <Option value="YYYYMMDD">YYYYMMDD</Option>
                  </Select>
                </div>

                <div>
                  <label>分隔符:</label>
                  <Select
                    value={config.separator}
                    onChange={(value) =>
                      setConfig({ ...config, separator: value })
                    }
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Option value="_">下划线 (_)</Option>
                    <Option value="-">横线 (-)</Option>
                    <Option value=" ">空格</Option>
                  </Select>
                </div>
              </>
            )}

            {config.rule === 'combination' && (
              <div>
                <label>组合规则模板:</label>
                <Input
                  value={config.combinationTemplate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      combinationTemplate: e.target.value,
                    })
                  }
                  placeholder="{date}_{time}_{original}"
                  style={{ marginTop: 8 }}
                />
                <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  可用变量: {'{date}'} {'{time}'} {'{original}'} {'{index}'}
                </p>
              </div>
            )}

            <div>
              <Checkbox
                checked={config.autoIndex}
                onChange={(e) =>
                  setConfig({ ...config, autoIndex: e.target.checked })
                }
              >
                自动添加序号（处理冲突）
              </Checkbox>
            </div>

            <div>
              <label>文件名长度限制:</label>
              <Input
                type="number"
                value={config.maxLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    maxLength: parseInt(e.target.value) || undefined,
                  })
                }
                style={{ width: 150, marginTop: 8 }}
                addonAfter="字符"
              />
            </div>
          </Space>
        </Card>

        {/* 步骤 3: 预览和确认 */}
        <Card title="步骤 3: 预览和确认" className="step-card">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={handleGeneratePreview}
              disabled={files.length === 0}
            >
              生成预览
            </Button>

            {hasConflicts && (
              <Alert
                message="检测到文件名冲突"
                description="部分文件重命名后会产生冲突，已自动处理"
                type="warning"
                showIcon
              />
            )}

            {previews.length > 0 && (
              <Table
                dataSource={previews}
                columns={previewColumns}
                rowKey={(record, index) => index?.toString() || ''}
                pagination={{ pageSize: 10 }}
              />
            )}

            <div>
              <Checkbox
                checked={backup}
                onChange={(e) => setBackup(e.target.checked)}
              >
                执行前备份原文件
              </Checkbox>
              {backup && (
                <Input
                  value={backupDir}
                  onChange={(e) => setBackupDir(e.target.value)}
                  placeholder="备份目录（留空使用原目录/backup）"
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            <Space>
              <Button onClick={() => navigate('/')}>取消</Button>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecuteRename}
                disabled={previews.length === 0 || isProcessing}
              >
                开始重命名
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 处理进度 */}
        {isProcessing && (
          <Card title="处理进度" className="step-card">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {progress && (
                <>
                  <Progress
                    percent={progress.percentage}
                    status="active"
                    format={(percent) => `${percent}%`}
                  />
                  <p>
                    当前处理: {progress.currentFile} ({progress.current} /{' '}
                    {progress.total})
                  </p>
                </>
              )}
              <Button icon={<StopOutlined />} onClick={handleCancel}>
                取消处理
              </Button>
            </Space>
          </Card>
        )}

        {/* 处理结果 */}
        {result && (
          <Card title="处理结果" className="step-card">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <p>成功: {result.success} 个文件</p>
                <p>失败: {result.failed} 个文件</p>
                <p>跳过: {result.skipped} 个文件</p>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p>错误详情:</p>
                  <ul>
                    {result.errors.map((error, index) => (
                      <li key={index}>
                        {error.file}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={() => navigate('/')}>返回首页</Button>
            </Space>
          </Card>
        )}
      </div>
    </div>
  );
}

export default RenamePage;

