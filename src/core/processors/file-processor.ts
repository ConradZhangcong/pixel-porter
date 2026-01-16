import { promises as fs } from 'fs';
import * as path from 'path';
import { FileInfo } from '../../shared/types';
import { SUPPORTED_IMAGE_FORMATS } from '../../shared/constants';

/**
 * 文件处理器
 * 负责文件系统操作、文件扫描、文件备份等
 */
export class FileProcessor {
  /**
   * 扫描文件夹，获取所有图片文件
   */
  async scanFolder(
    folderPath: string,
    recursive: boolean = false
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      await this.scanDirectory(folderPath, recursive, files);
      return files;
    } catch (error) {
      console.error(`扫描文件夹失败: ${folderPath}`, error);
      throw error;
    }
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(
    dirPath: string,
    recursive: boolean,
    files: FileInfo[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && recursive) {
        await this.scanDirectory(fullPath, recursive, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase().slice(1);
        if (SUPPORTED_IMAGE_FORMATS.includes(ext as any)) {
          const fileInfo = await this.getFileInfo(fullPath);
          if (fileInfo) {
            files.push(fileInfo);
          }
        }
      }
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const parsed = path.parse(filePath);

      return {
        path: filePath,
        name: parsed.base,
        size: stats.size,
        extension: parsed.ext.slice(1).toLowerCase(),
        createTime: stats.birthtime,
        modifyTime: stats.mtime,
      };
    } catch (error) {
      console.error(`获取文件信息失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 批量获取文件信息
   */
  async getFilesInfo(filePaths: string[]): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    for (const filePath of filePaths) {
      const fileInfo = await this.getFileInfo(filePath);
      if (fileInfo) {
        files.push(fileInfo);
      }
    }

    return files;
  }

  /**
   * 重命名文件
   */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      console.error(`重命名文件失败: ${oldPath} -> ${newPath}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 备份文件
   */
  async backupFile(
    filePath: string,
    backupDir: string
  ): Promise<string> {
    try {
      // 确保备份目录存在
      await fs.mkdir(backupDir, { recursive: true });

      const fileName = path.basename(filePath);
      const backupPath = path.join(backupDir, fileName);

      // 如果备份文件已存在，添加序号
      let finalBackupPath = backupPath;
      let counter = 1;
      while (await this.fileExists(finalBackupPath)) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        finalBackupPath = path.join(
          backupDir,
          `${nameWithoutExt}_${counter}${ext}`
        );
        counter++;
      }

      await fs.copyFile(filePath, finalBackupPath);
      return finalBackupPath;
    } catch (error) {
      console.error(`备份文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 批量备份文件
   */
  async backupFiles(
    filePaths: string[],
    backupDir: string
  ): Promise<Map<string, string>> {
    const backupMap = new Map<string, string>();

    for (const filePath of filePaths) {
      try {
        const backupPath = await this.backupFile(filePath, backupDir);
        backupMap.set(filePath, backupPath);
      } catch (error) {
        console.error(`备份文件失败: ${filePath}`, error);
        // 继续处理其他文件
      }
    }

    return backupMap;
  }

  /**
   * 获取文件所在目录
   */
  getFileDirectory(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * 生成新文件路径（在同一目录下）
   */
  generateNewFilePath(oldPath: string, newName: string): string {
    const dir = this.getFileDirectory(oldPath);
    return path.join(dir, newName);
  }
}

