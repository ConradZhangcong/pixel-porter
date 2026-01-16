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

// 命名规则配置类型
export interface NamingRuleConfig {
  rule: NamingRule;
  dateFormat?: string; // 日期格式，如 YYYYMMDD_HHMMSS
  separator?: string; // 分隔符，如下划线、横线等
  combinationTemplate?: string; // 组合规则模板，如 {date}_{time}_{original}
  addPrefix?: string; // 添加前缀
  addSuffix?: string; // 添加后缀
  maxLength?: number; // 文件名最大长度
  autoIndex?: boolean; // 自动添加序号处理冲突
}

// 重命名预览项
export interface RenamePreviewItem {
  fileInfo: FileInfo;
  newName: string;
  newPath: string;
  hasConflict: boolean;
  conflictReason?: string;
}

// 重命名选项
export interface RenameOptions {
  backup?: boolean;
  backupDir?: string;
}

