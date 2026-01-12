// 文件信息类型
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  createTime?: Date;
  modifyTime?: Date;
}

// EXIF信息类型
export interface ExifData {
  DateTimeOriginal?: string;
  CreateDate?: string;
  ModifyDate?: string;
  Make?: string;
  Model?: string;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  FocalLength?: number;
  ExposureMode?: number;
  WhiteBalance?: number;
  Flash?: number;
  MeteringMode?: number;
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSAltitude?: number;
  [key: string]: unknown;
}

// 命名规则类型
export type NamingRule = 'exif-date' | 'file-date' | 'original' | 'combination';

// 水印位置类型
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';

// 处理进度类型
export interface ProcessProgress {
  current: number;
  total: number;
  currentFile?: string;
  percentage: number;
}

// 处理结果类型
export interface ProcessResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ProcessError[];
}

export interface ProcessError {
  file: string;
  message: string;
  code?: string;
}

