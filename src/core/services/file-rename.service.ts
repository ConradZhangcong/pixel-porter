import { FileInfo, ProcessProgress, ProcessResult, ProcessError, NamingRuleConfig, RenamePreviewItem, ExifData } from '../../shared/types';
import { ExifProcessor } from '../processors/exif-processor';
import { FileProcessor } from '../processors/file-processor';
import { NamingEngine } from '../processors/naming-engine';
import { ConflictDetector } from '../processors/conflict-detector';
import { EventEmitter } from 'events';

/**
 * 文件重命名服务
 * 整合各个处理器，提供完整的文件重命名功能
 */
export class FileRenameService extends EventEmitter {
  private exifProcessor: ExifProcessor;
  private fileProcessor: FileProcessor;
  private namingEngine: NamingEngine;
  private conflictDetector: ConflictDetector;
  private isProcessing: boolean = false;
  private cancelRequested: boolean = false;

  constructor() {
    super();
    this.exifProcessor = new ExifProcessor();
    this.fileProcessor = new FileProcessor();
    this.namingEngine = new NamingEngine();
    this.conflictDetector = new ConflictDetector();
  }

  /**
   * 扫描文件夹获取文件列表
   */
  async scanFolder(
    folderPath: string,
    recursive: boolean = false
  ): Promise<FileInfo[]> {
    return await this.fileProcessor.scanFolder(folderPath, recursive);
  }

  /**
   * 获取文件信息
   */
  async getFilesInfo(filePaths: string[]): Promise<FileInfo[]> {
    return await this.fileProcessor.getFilesInfo(filePaths);
  }

  /**
   * 提取文件的EXIF信息
   */
  async extractExifData(files: FileInfo[]): Promise<Map<string, ExifData | null>> {
    const exifDataMap = new Map<string, ExifData | null>();

    for (const file of files) {
      try {
        const exifData = await this.exifProcessor.readExif(file.path);
        if (exifData) {
          exifDataMap.set(file.path, exifData);
        }
      } catch (error) {
        console.error(`提取EXIF失败: ${file.path}`, error);
      }
    }

    return exifDataMap;
  }

  /**
   * 生成重命名预览
   */
  async generatePreview(
    files: FileInfo[],
    config: NamingRuleConfig
  ): Promise<{
    previews: RenamePreviewItem[];
    hasConflicts: boolean;
    conflicts: RenamePreviewItem[];
  }> {
    // 提取EXIF信息
    const exifDataMap = await this.extractExifData(files);

    // 检测冲突并生成预览
    const result = await this.conflictDetector.detectConflicts(
      files,
      exifDataMap,
      config
    );

    return {
      previews: result.previews,
      hasConflicts: result.hasConflicts,
      conflicts: result.conflicts,
    };
  }

  /**
   * 执行重命名操作
   */
  async executeRename(
    previews: RenamePreviewItem[],
    options: {
      backup?: boolean;
      backupDir?: string;
    } = {}
  ): Promise<ProcessResult> {
    if (this.isProcessing) {
      throw new Error('已有处理任务正在进行中');
    }

    this.isProcessing = true;
    this.cancelRequested = false;

    const result: ProcessResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // 备份文件（如果需要）
      const backupMap = new Map<string, string>();
      if (options.backup && options.backupDir) {
        const filePaths = previews.map((p) => p.fileInfo.path);
        const backups = await this.fileProcessor.backupFiles(
          filePaths,
          options.backupDir
        );
        backups.forEach((backupPath, filePath) => {
          backupMap.set(filePath, backupPath);
        });
      }

      // 执行重命名
      for (let i = 0; i < previews.length; i++) {
        if (this.cancelRequested) {
          throw new Error('用户取消操作');
        }

        const preview = previews[i];
        const progress: ProcessProgress = {
          current: i + 1,
          total: previews.length,
          currentFile: preview.fileInfo.name,
          percentage: Math.round(((i + 1) / previews.length) * 100),
        };

        this.emit('progress', progress);

        try {
          // 如果新路径和原路径相同，跳过
          if (preview.newPath === preview.fileInfo.path) {
            result.skipped++;
            continue;
          }

          await this.fileProcessor.renameFile(
            preview.fileInfo.path,
            preview.newPath
          );
          result.success++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            file: preview.fileInfo.path,
            message: error.message || '重命名失败',
            code: error.code,
          });
        }
      }
    } finally {
      this.isProcessing = false;
      this.cancelRequested = false;
    }

    return result;
  }

  /**
   * 取消当前处理任务
   */
  cancel(): void {
    this.cancelRequested = true;
  }

  /**
   * 检查是否正在处理
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}

