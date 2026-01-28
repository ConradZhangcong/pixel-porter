import { extname, join } from "node:path";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import inquirer from "inquirer";

import {
  scanDirectory,
  getFileInfo,
  copyFileTo,
  fileExists,
} from "./scripts/file.ts";
import { getConfig } from "./scripts/config.ts";

/**
 * 清空目录内容
 * @param dirPath 目录路径
 */
const clearDirectory = async (dirPath: string): Promise<void> => {
  try {
    const dirStat = await stat(dirPath);
    if (dirStat.isDirectory()) {
      const entries = await readdir(dirPath);
      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        await rm(entryPath, { recursive: true, force: true });
      }
    }
  } catch (error) {
    // 目录不存在，忽略错误
  }
};

const config = await getConfig();
// console.log("config: ", config);

// 创建输出目录
await mkdir(config.outputDir, { recursive: true });

const files = await scanDirectory(config.inputDir, config.recursive);
// console.log(files);

if (!files || files.length === 0) {
  console.log("No files to process");
  process.exit(0);
}

// 如果输出目录不存在，则创建输出目录
if (!(await fileExists(config.outputDir))) {
  await mkdir(config.outputDir, { recursive: true });
}
// 如果输出目录中存在文件, 则提示用户输入判断是否清空
const answer = await inquirer.prompt([
  {
    type: "confirm",
    name: "clear",
    message: "Output directory is not empty. Do you want to clear it?",
  },
]);
if (!answer.clear) {
  console.log("User does not want to clear the output directory");
  process.exit(0);
}
// 清空输出目录（如果存在）
await clearDirectory(config.outputDir);

for (const file of files) {
  // 根据文件扩展名判断是否继续处理
  const ext = extname(file).toLowerCase().slice(1);
  if (!config.fileTypes.includes(ext)) {
    continue;
  }
  // 获取文件信息
  const fileInfo = await getFileInfo(file);
  console.log(fileInfo);
  // 使用文件创建时间作为文件名
  const fileName = fileInfo.createdAt.toISOString().replace(/[:.]/g, "-");
  const newFileName = `${fileName}.${ext}`;
  const newFilePath = join(config.outputDir, newFileName);
  await copyFileTo(file, newFilePath);
}
