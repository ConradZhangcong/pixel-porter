import * as path from 'path';
import { FileInfo, NamingRuleConfig, RenamePreviewItem, ExifData } from '../../shared/types';
import { NamingEngine } from './naming-engine';
import { FileProcessor } from './file-processor';

/**
 * 冲突检测结果
 */
export interface ConflictDetectionResult {
  previews: RenamePreviewItem[];
  hasConflicts: boolean;
  conflicts: RenamePreviewItem[];
}

/**
 * 冲突检测器
 * 检测重命名后可能产生的文件名冲突
 */
export class ConflictDetector {
  private namingEngine: NamingEngine;
  private fileProcessor: FileProcessor;

  constructor() {
    this.namingEngine = new NamingEngine();
    this.fileProcessor = new FileProcessor();
  }

  /**
   * 检测冲突并生成预览
   */
  async detectConflicts(
    files: FileInfo[],
    exifDataMap: Map<string, ExifData | null>,
    config: NamingRuleConfig
  ): Promise<ConflictDetectionResult> {
    const previews: RenamePreviewItem[] = [];
    const nameCountMap = new Map<string, number[]>();

    // 第一步：生成所有新文件名
    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      const exifData = exifDataMap.get(fileInfo.path) ?? null;
      const newName = this.namingEngine.generateFileName(
        fileInfo,
        exifData,
        config
      );
      const newPath = this.fileProcessor.generateNewFilePath(
        fileInfo.path,
        newName
      );

      previews.push({
        fileInfo,
        newName,
        newPath,
        hasConflict: false,
      });

      // 统计同名文件
      if (!nameCountMap.has(newPath)) {
        nameCountMap.set(newPath, []);
      }
      nameCountMap.get(newPath)!.push(i);
    }

    // 第二步：检测内部冲突（多个文件重命名为同一名称）
    const conflicts: RenamePreviewItem[] = [];
    for (const [, indices] of nameCountMap.entries()) {
      if (indices.length > 1) {
        // 多个文件重命名为同一名称，需要添加序号
        for (let j = 0; j < indices.length; j++) {
          const index = indices[j];
          const preview = previews[index];
          if (j > 0) {
            // 第一个保留原名，后续添加序号
            preview.newName = this.namingEngine.addIndexToFileName(
              preview.newName,
              j
            );
            preview.newPath = this.fileProcessor.generateNewFilePath(
              preview.fileInfo.path,
              preview.newName
            );
            preview.hasConflict = true;
            preview.conflictReason = '多个文件重命名为同一名称';
            conflicts.push(preview);
          }
        }
      }
    }

    // 第三步：检测外部冲突（目标文件名已存在）
    for (const preview of previews) {
      // 如果新路径和原路径相同，跳过检查
      if (preview.newPath === preview.fileInfo.path) {
        continue;
      }

      const exists = await this.fileProcessor.fileExists(preview.newPath);
      if (exists) {
        preview.hasConflict = true;
        preview.conflictReason = '目标文件名已存在';
        if (!conflicts.includes(preview)) {
          conflicts.push(preview);
        }
      }
    }

    // 如果启用自动添加序号，处理冲突
    if (config.autoIndex) {
      await this.resolveConflictsWithIndex(previews, conflicts);
    }

    return {
      previews,
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * 使用序号解决冲突
   */
  private async resolveConflictsWithIndex(
    previews: RenamePreviewItem[],
    conflicts: RenamePreviewItem[]
  ): Promise<void> {
    const pathCountMap = new Map<string, number>();

    for (const conflict of conflicts) {
      let counter = 1;
      let newPath = conflict.newPath;

      // 如果目标文件已存在，添加序号直到找到可用名称
      while (await this.fileProcessor.fileExists(newPath)) {
        const indexedName = this.namingEngine.addIndexToFileName(
          conflict.newName,
          counter
        );
        newPath = this.fileProcessor.generateNewFilePath(
          conflict.fileInfo.path,
          indexedName
        );
        counter++;
      }

      // 检查是否与其他预览项冲突
      const basePath = newPath;
      if (pathCountMap.has(basePath)) {
        const count = pathCountMap.get(basePath)!;
        pathCountMap.set(basePath, count + 1);
        const indexedName = this.namingEngine.addIndexToFileName(
          conflict.newName,
          count + 1
        );
        newPath = this.fileProcessor.generateNewFilePath(
          conflict.fileInfo.path,
          indexedName
        );
      } else {
        pathCountMap.set(basePath, 1);
      }

      conflict.newName = path.basename(newPath);
      conflict.newPath = newPath;
      conflict.hasConflict = false; // 已解决
      conflict.conflictReason = undefined;
    }
  }
}

