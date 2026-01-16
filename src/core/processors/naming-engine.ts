import dayjs from 'dayjs';
import * as path from 'path';
import { FileInfo, ExifData, NamingRuleConfig } from '../../shared/types';

/**
 * 命名规则引擎
 * 根据配置生成新文件名
 */
export class NamingEngine {
  /**
   * 生成新文件名
   */
  generateFileName(
    fileInfo: FileInfo,
    exifData: ExifData | null,
    config: NamingRuleConfig
  ): string {
    const ext = fileInfo.extension;
    let newName = '';

    switch (config.rule) {
      case 'exif-date':
        newName = this.generateFromExifDate(exifData, fileInfo, config);
        break;
      case 'file-date':
        newName = this.generateFromFileDate(fileInfo, config);
        break;
      case 'original':
        newName = this.generateFromOriginal(fileInfo, config);
        break;
      case 'combination':
        newName = this.generateFromCombination(
          fileInfo,
          exifData,
          config
        );
        break;
      default:
        newName = fileInfo.name;
    }

    // 应用前缀和后缀
    if (config.addPrefix) {
      newName = config.addPrefix + newName;
    }
    if (config.addSuffix) {
      const nameWithoutExt = path.basename(newName, `.${ext}`);
      newName = `${nameWithoutExt}${config.addSuffix}.${ext}`;
    }

    // 应用长度限制
    if (config.maxLength) {
      newName = this.limitFileNameLength(newName, config.maxLength);
    }

    // 确保文件名有效
    newName = this.sanitizeFileName(newName);

    return newName;
  }

  /**
   * 基于EXIF拍摄时间生成文件名
   */
  private generateFromExifDate(
    exifData: ExifData | null,
    fileInfo: FileInfo,
    config: NamingRuleConfig
  ): string {
    const dateFormat = config.dateFormat || 'YYYYMMDD_HHMMSS';
    const separator = config.separator || '_';

    let date: Date | null = null;

    if (exifData?.DateTimeOriginal) {
      date = new Date(exifData.DateTimeOriginal);
    } else if (exifData?.CreateDate) {
      date = new Date(exifData.CreateDate);
    }

    // 如果没有EXIF日期，使用文件创建时间
    if (!date || isNaN(date.getTime())) {
      date = fileInfo.createTime || fileInfo.modifyTime || new Date();
    }

    const formattedDate = dayjs(date).format(
      dateFormat.replace(/_/g, separator)
    );
    const ext = fileInfo.extension;
    return `${formattedDate}.${ext}`;
  }

  /**
   * 基于文件创建时间生成文件名
   */
  private generateFromFileDate(
    fileInfo: FileInfo,
    config: NamingRuleConfig
  ): string {
    const dateFormat = config.dateFormat || 'YYYYMMDD_HHMMSS';
    const separator = config.separator || '_';
    const date = fileInfo.createTime || fileInfo.modifyTime || new Date();

    const formattedDate = dayjs(date).format(
      dateFormat.replace(/_/g, separator)
    );
    const ext = fileInfo.extension;
    return `${formattedDate}.${ext}`;
  }

  /**
   * 基于原始文件名生成文件名
   */
  private generateFromOriginal(
    fileInfo: FileInfo,
    config: NamingRuleConfig
  ): string {
    return fileInfo.name;
  }

  /**
   * 基于组合规则生成文件名
   */
  private generateFromCombination(
    fileInfo: FileInfo,
    exifData: ExifData | null,
    config: NamingRuleConfig
  ): string {
    const template = config.combinationTemplate || '{date}_{original}';
    const separator = config.separator || '_';
    const dateFormat = config.dateFormat || 'YYYYMMDD_HHMMSS';

    // 提取原始文件名（不含扩展名）
    const originalName = path.basename(
      fileInfo.name,
      `.${fileInfo.extension}`
    );

    // 获取日期时间
    let date: Date | null = null;
    if (exifData?.DateTimeOriginal) {
      date = new Date(exifData.DateTimeOriginal);
    } else if (exifData?.CreateDate) {
      date = new Date(exifData.CreateDate);
    } else {
      date = fileInfo.createTime || fileInfo.modifyTime || new Date();
    }

    const formattedDate = dayjs(date).format(
      dateFormat.replace(/_/g, separator)
    );
    const formattedTime = dayjs(date).format('HHmmss');

    // 替换模板变量
    let newName = template
      .replace(/{date}/g, formattedDate.split('_')[0] || formattedDate.split(separator)[0])
      .replace(/{time}/g, formattedTime)
      .replace(/{datetime}/g, formattedDate)
      .replace(/{original}/g, originalName)
      .replace(/{index}/g, ''); // 序号由冲突处理添加

    const ext = fileInfo.extension;
    return `${newName}.${ext}`;
  }

  /**
   * 限制文件名长度
   */
  private limitFileNameLength(fileName: string, maxLength: number): string {
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);
    const maxNameLength = maxLength - ext.length;

    if (nameWithoutExt.length <= maxNameLength) {
      return fileName;
    }

    return `${nameWithoutExt.substring(0, maxNameLength)}${ext}`;
  }

  /**
   * 清理文件名，移除非法字符
   */
  private sanitizeFileName(fileName: string): string {
    // 移除或替换非法字符
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * 为文件名添加序号（处理冲突）
   */
  addIndexToFileName(fileName: string, index: number): string {
    const ext = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, ext);
    return `${nameWithoutExt}_${String(index).padStart(3, '0')}${ext}`;
  }
}

