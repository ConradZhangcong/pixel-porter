// 支持的图片格式
export const SUPPORTED_IMAGE_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff',
  'tif',
  'webp',
  'raw',
  'cr2',
  'nef',
  'orf',
  'sr2',
] as const;

// IPC通道常量
export const IPC_CHANNELS = {
  FILE_SELECT: 'file:select',
  FILE_SELECT_FOLDER: 'file:select-folder',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
} as const;

// 应用配置键
export const CONFIG_KEYS = {
  RENAME_DEFAULT_RULE: 'rename.defaultRule',
  RENAME_DEFAULT_DATE_FORMAT: 'rename.defaultDateFormat',
  WATERMARK_DEFAULT_POSITION: 'watermark.defaultPosition',
  WATERMARK_DEFAULT_FONT_SIZE: 'watermark.defaultFontSize',
  EXIF_COPY_DEFAULT_STRATEGY: 'exifCopy.defaultStrategy',
} as const;

