import { readdirSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { fileTypeFromFile } from "file-type";
import exifr from "exifr";
import dayjs from "dayjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 输入文件夹路径
const INPUT_DIR = "input";
const OUTPUT_DIR = "output";
const UNRESOLVED_DIR = "unresolved";

/**
 * 获取目录下所有文件
 * @param dirPath 目标目录路径
 * @returns 所有文件的结对路径
 */
const getAllFiles = (dirPath: string): string[] => {
  const result: string[] = [];
  const files = readdirSync(resolve(__dirname, dirPath), {
    withFileTypes: true,
  });

  for (const fileInfo of files) {
    if (fileInfo.isDirectory()) {
      // 如果是文件夹
    } else {
      result.push(resolve(__dirname, dirPath, fileInfo.name));
    }
  }

  return result;
};

/**
 * 获取目录下所有图片文件
 * @param dirPath 目标目录路径
 * @returns 所有图片文件的结对路径
 */
const getImageFiles = async (dirPath: string): Promise<string[]> => {
  const allFiles = getAllFiles(dirPath);
  const imageFiles: string[] = [];

  for (const file of allFiles) {
    const fileType = await fileTypeFromFile(file);
    if (fileType && fileType.mime.startsWith("image/")) {
      imageFiles.push(file);
    }
  }

  return imageFiles;
};

const getExifData = async (buffer) => {
  // 解析EXIF数据
  const exifData = await exifr.parse(buffer, {
    gps: true,
    // 显式指定需要提取的字段（可选，但可提高性能）
    pick: [
      "Make", // 相机品牌
      "Model", // 相机型号
      "LensModel", // 镜头型号
      "FNumber", // 光圈值
      "ExposureTime", // 曝光时间
      "ISO", // ISO感光度
      "FocalLength", // 焦距
      "FocalLengthIn35mmFormat", // 等效 35mm 焦距
      "DateTimeOriginal", // 拍摄时间
      "GPSLatitude", // 纬度
      "GPSLongitude", // 经度
    ],
  });

  return exifData;
};

const main = async () => {
  // const files = getAllFiles(INPUT_DIR);
  // 获取所有图片文件
  const imageFiles = await getImageFiles(INPUT_DIR);
  // 将图片文件以拍摄时间为文件名重命名
  for (const file of imageFiles) {
    const exifData = await getExifData(file);
    const shootTime = exifData.DateTimeOriginal;
    if (!shootTime) {
      console.log(`未找到 ${file} 的拍摄时间，跳过重命名。`);
      // 拍摄时间不存在，将文件移动到未解决目录
      const targetDir = resolve(__dirname, UNRESOLVED_DIR);
      // 如果导出目录不存在，则创建导出结果目录
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir);
      }
      const newPath = resolve(__dirname, UNRESOLVED_DIR, file);
      copyFileSync(file, newPath);
      continue;
    }
    const formattedDate = dayjs(shootTime).format("YYYY-MM-DD HH:mm:ss");
    const ext = file.split(".").pop();
    const newFileName = `${formattedDate}.${ext}`;
    const targetDir = resolve(__dirname, OUTPUT_DIR);
    // 如果导出目录不存在，则创建导出结果目录
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir);
    }
    const newPath = resolve(__dirname, OUTPUT_DIR, newFileName);
    copyFileSync(file, newPath);
  }
};

main();
