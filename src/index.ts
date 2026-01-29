import { extname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import inquirer from "inquirer";
import chalk from "chalk";

import {
  scanDirectory,
  getFileInfo,
  copyFileTo,
  fileExists,
  clearDirectory,
} from "./scripts/file.ts";
import { getConfig } from "./scripts/config.ts";
import { formatDate } from "./scripts/time.ts";
import { messages } from "./const/messages.ts";

const config = await getConfig();
// console.log("config: ", config);

const files = await scanDirectory(config.inputDir, config.recursive);
// console.log(files);

if (!files || files.length === 0) {
  console.log(chalk.red(messages.errors.noFiles));
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
    message: chalk.blue(messages.prompts.clearOutput),
  },
]);
if (!answer.clear) {
  console.log(chalk.yellow(messages.warnings.notClearOutput));
  process.exit(0);
}
// 清空输出目录（如果存在）
await clearDirectory(config.outputDir);
console.log(chalk.green(messages.info.clearSuccess));

for (const file of files) {
  // 根据文件扩展名判断是否继续处理
  const ext = extname(file).toLowerCase().slice(1);
  if (!config.fileTypes.includes(ext)) {
    continue;
  }
  // 获取文件信息
  const fileInfo = await getFileInfo(file);
  // console.log(fileInfo);
  // 使用文件创建时间作为文件名
  const fileName = formatDate(fileInfo.createdAt);
  const newFileName = `${fileName}.${ext}`;
  const newFilePath = join(config.outputDir, newFileName);
  await copyFileTo(file, newFilePath);
}

console.log(chalk.green(messages.info.processComplete));
