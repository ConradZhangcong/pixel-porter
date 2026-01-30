/**
 * 文件信息接口
 */
export interface FileInfo {
  filePath: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

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
