import { extname, join, basename } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
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
import { getExifInfo } from "./scripts/exif.ts";

import { messages } from "./const/messages.ts";

// 主函数
async function main() {
  console.log(chalk.cyan("=== 图片文件处理工具 ==="));
  console.log(chalk.grey(`输入目录: ${config.inputDir}`));
  console.log(chalk.grey(`输出目录: ${config.outputDir}`));
  console.log(chalk.grey(`支持的文件类型: ${config.fileTypes.join(", ")}`));
  console.log();

  console.log(chalk.blue("正在扫描文件..."));
  const files = await scanDirectory(config.inputDir, config.recursive);

  if (!files || files.length === 0) {
    console.log(chalk.red(messages.errors.noFiles));
    process.exit(0);
  }

  console.log(chalk.green(`找到 ${files.length} 个文件`));
  console.log();

  // 如果输出目录不存在，则创建输出目录
  if (!(await fileExists(config.outputDir))) {
    console.log(chalk.blue("创建输出目录..."));
    await mkdir(config.outputDir, { recursive: true });
    console.log(chalk.green("输出目录创建成功"));
  }

  // 如果日志目录不存在，则创建日志目录
  if (!(await fileExists(config.logsDir))) {
    console.log(chalk.blue("创建日志目录..."));
    await mkdir(config.logsDir, { recursive: true });
    console.log(chalk.green("日志目录创建成功"));
  }
  // 如果输出目录中存在文件, 则提示用户输入判断是否清空
  else {
    const outputFiles = await scanDirectory(config.outputDir);
    if (outputFiles && outputFiles.length > 0) {
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
      console.log(chalk.blue("清空输出目录..."));
      await clearDirectory(config.outputDir);
      console.log(chalk.green(messages.info.clearSuccess));
    }
  }

  console.log();
  console.log(chalk.blue("开始处理文件..."));
  console.log("=".repeat(60));

  let processedCount = 0;
  let skippedCount = 0;
  const logData: any[] = [];

  for (const file of files) {
    try {
      // 根据文件扩展名判断是否继续处理
      const ext = extname(file).toLowerCase().slice(1);
      if (!config.fileTypes.includes(ext)) {
        console.log(chalk.yellow(`跳过 ${basename(file)} - 不支持的文件类型`));
        skippedCount++;
        continue;
      }

      console.log();
      console.log(chalk.cyan(`处理文件: ${basename(file)}`));

      // 获取文件信息
      const fileInfo = await getFileInfo(file);
      console.log(chalk.grey(`原始路径: ${fileInfo.filePath}`));
      console.log(
        chalk.grey(`文件大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`),
      );
      console.log(
        chalk.grey(`创建时间: ${fileInfo.createdAt.toLocaleString()}`),
      );

      // 获取并打印EXIF信息
      const exifInfo = await getExifInfo(file);
      let timeSource = "文件创建时间";
      let exifDateTimeOriginal = null;

      // 确定使用的时间：优先使用EXIF中的拍摄时间，否则使用文件创建时间
      let fileName = formatDate(fileInfo.createdAt);
      let finalTimeUsed = fileInfo.createdAt;

      if (exifInfo) {
        console.log(chalk.cyan("EXIF信息:"));
        console.log(exifInfo);

        exifDateTimeOriginal = exifInfo.DateTimeOriginal || null;

        // 尝试从EXIF信息中获取拍摄时间
        if (exifInfo.DateTimeOriginal) {
          fileName = exifInfo.DateTimeOriginal;
          timeSource = "EXIF拍摄时间";
          // 尝试解析EXIF时间字符串为Date对象
          const exifTime = new Date(exifInfo.DateTimeOriginal);
          if (!isNaN(exifTime.getTime())) {
            finalTimeUsed = exifTime;
          }
        } else if (exifInfo.CreateDate) {
          fileName = exifInfo.CreateDate;
          timeSource = "EXIF创建时间";
          const exifTime = new Date(exifInfo.CreateDate);
          if (!isNaN(exifTime.getTime())) {
            finalTimeUsed = exifTime;
          }
        } else if (exifInfo.ModifyDate) {
          fileName = exifInfo.ModifyDate;
          timeSource = "EXIF修改时间";
          const exifTime = new Date(exifInfo.ModifyDate);
          if (!isNaN(exifTime.getTime())) {
            finalTimeUsed = exifTime;
          }
        }
      } else {
        console.log(chalk.yellow("未获取到EXIF信息"));
      }

      const newFileName = `${fileName}.${ext}`;
      const newFilePath = join(config.outputDir, newFileName);

      console.log(chalk.grey(`时间来源: ${timeSource}`));
      console.log(chalk.grey(`目标文件名: ${newFileName}`));

      await copyFileTo(file, newFilePath);
      console.log(chalk.green("✓ 处理成功"));
      processedCount++;

      // 收集日志数据
      logData.push({
        originalFileName: basename(file),
        originalPath: fileInfo.filePath,
        fileSize: fileInfo.size,
        fileSizeMB: (fileInfo.size / 1024 / 1024).toFixed(2),
        creationDate: fileInfo.createdAt.toISOString(),
        creationDateLocal: fileInfo.createdAt.toLocaleString(),
        exifDateTimeOriginal: exifDateTimeOriginal,
        timeSource: timeSource,
        finalTimeUsed: finalTimeUsed.toISOString(),
        finalTimeUsedLocal: finalTimeUsed.toLocaleString(),
        newFileName: newFileName,
        newFilePath: newFilePath
      });
    } catch (error) {
      console.log(chalk.red(`✗ 处理失败: ${(error as Error).message}`));
      skippedCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(chalk.green("=== 处理完成 ==="));
  console.log(chalk.green(`成功处理: ${processedCount} 个文件`));
  console.log(chalk.yellow(`跳过处理: ${skippedCount} 个文件`));
  console.log(chalk.cyan(`总计: ${files.length} 个文件`));
  console.log();

  // 生成Markdown格式的日志内容
  const generateMarkdownLog = (data: any[]): string => {
    let markdown = `# 文件处理日志\n\n`;
    markdown += `生成时间: ${new Date().toLocaleString()}\n`;
    markdown += `成功处理: ${processedCount} 个文件\n`;
    markdown += `跳过处理: ${skippedCount} 个文件\n`;
    markdown += `总计: ${files.length} 个文件\n\n`;
    
    markdown += `| 原始文件名 | 文件大小 | 创建日期 | EXIF拍摄时间 | 时间来源 | 最终使用时间 | 新文件名 |\n`;
    markdown += `|----------|---------|---------|-------------|---------|-------------|---------|\n`;
    
    data.forEach(item => {
      markdown += `| ${item.originalFileName} | ${item.fileSizeMB} MB | ${item.creationDateLocal} | ${item.exifDateTimeOriginal || '-'} | ${item.timeSource} | ${item.finalTimeUsedLocal} | ${item.newFileName} |\n`;
    });
    
    return markdown;
  };

  // 导出日志文件
  if (logData.length > 0) {
    console.log(chalk.blue("正在导出日志文件..."));
    const logFileName = `file_processing_log_${formatDate(new Date())}.md`;
    const logFilePath = join(config.logsDir, logFileName);

    try {
      const markdownContent = generateMarkdownLog(logData);
      await writeFile(logFilePath, markdownContent, 'utf8');
      console.log(chalk.green(`✓ 日志文件导出成功: ${logFileName}`));
      console.log(chalk.grey(`日志文件路径: ${logFilePath}`));
    } catch (error) {
      console.log(chalk.red(`✗ 日志文件导出失败: ${(error as Error).message}`));
    }
  }
}

// 配置
const config = await getConfig();

// 运行主函数
main().catch((error) => {
  console.error(chalk.red(`发生错误: ${error.message}`));
  process.exit(1);
});
