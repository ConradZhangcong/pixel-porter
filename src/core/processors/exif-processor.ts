import exifr from 'exifr';
import { ExifData } from '../../shared/types';

/**
 * EXIF处理器
 * 负责读取和处理图片的EXIF信息
 */
export class ExifProcessor {
  private cache: Map<string, ExifData> = new Map();

  /**
   * 从图片文件读取EXIF信息
   */
  async readExif(filePath: string): Promise<ExifData | null> {
    // 检查缓存
    const cacheKey = filePath;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const exifData = await exifr.parse(filePath, {
        // 提取需要的字段
        pick: [
          'DateTimeOriginal',
          'CreateDate',
          'ModifyDate',
          'Make',
          'Model',
          'FNumber',
          'ExposureTime',
          'ISO',
          'FocalLength',
          'ExposureMode',
          'WhiteBalance',
          'Flash',
          'MeteringMode',
          'GPSLatitude',
          'GPSLongitude',
          'GPSAltitude',
        ],
      });

      if (exifData) {
        const formattedData: ExifData = {
          DateTimeOriginal: exifData.DateTimeOriginal
            ? this.formatDateTime(exifData.DateTimeOriginal)
            : undefined,
          CreateDate: exifData.CreateDate
            ? this.formatDateTime(exifData.CreateDate)
            : undefined,
          ModifyDate: exifData.ModifyDate
            ? this.formatDateTime(exifData.ModifyDate)
            : undefined,
          Make: exifData.Make,
          Model: exifData.Model,
          FNumber: exifData.FNumber,
          ExposureTime: exifData.ExposureTime,
          ISO: exifData.ISO,
          FocalLength: exifData.FocalLength,
          ExposureMode: exifData.ExposureMode,
          WhiteBalance: exifData.WhiteBalance,
          Flash: exifData.Flash,
          MeteringMode: exifData.MeteringMode,
          GPSLatitude: exifData.GPSLatitude,
          GPSLongitude: exifData.GPSLongitude,
          GPSAltitude: exifData.GPSAltitude,
        };

        // 缓存结果
        this.cache.set(cacheKey, formattedData);
        return formattedData;
      }

      return null;
    } catch (error) {
      console.error(`读取EXIF信息失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(dateTime: string | Date): string {
    if (typeof dateTime === 'string') {
      return dateTime;
    }
    if (dateTime instanceof Date) {
      return dateTime.toISOString();
    }
    return '';
  }

  /**
   * 获取拍摄时间（优先使用DateTimeOriginal，否则使用CreateDate）
   */
  getDateTimeOriginal(exifData: ExifData | null): Date | null {
    if (!exifData) {
      return null;
    }

    if (exifData.DateTimeOriginal) {
      const date = new Date(exifData.DateTimeOriginal);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    if (exifData.CreateDate) {
      const date = new Date(exifData.CreateDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除指定文件的缓存
   */
  clearCacheForFile(filePath: string): void {
    this.cache.delete(filePath);
  }
}

