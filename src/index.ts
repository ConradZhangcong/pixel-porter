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

// 进度条渲染
function renderProgressBar(current: number, total: number, width = 25): string {
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const percent = Math.round(ratio * 100);
  const bar = chalk.green("█".repeat(filled)) + chalk.grey("░".repeat(empty));
  return `${bar} ${chalk.white.bold(`${percent}%`)} ${chalk.grey(`(${current}/${total})`)}`;
}

// 清除当前行并重置光标
function clearLine() {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

// 显示实时进度
function showProgress(current: number, total: number, fileName: string) {
  clearLine();
  const truncatedName = fileName.length > 30 ? fileName.slice(0, 27) + "..." : fileName;
  process.stdout.write(`  ${renderProgressBar(current, total)}  ${chalk.grey(truncatedName)}`);
}

// 打印一行结果（先清除进度条，打印结果，再恢复进度条）
function printResult(line: string) {
  clearLine();
  console.log(line);
}

// 生成唯一文件名，重复时追加 _001, _002 ...
async function getUniqueFilePath(dir: string, name: string, ext: string): Promise<{ fileName: string; filePath: string }> {
  const basePath = join(dir, `${name}.${ext}`);
  if (!(await fileExists(basePath))) {
    return { fileName: `${name}.${ext}`, filePath: basePath };
  }

  let suffix = 1;
  while (true) {
    const suffixStr = suffix.toString().padStart(3, "0");
    const candidateName = `${name}_${suffixStr}.${ext}`;
    const candidatePath = join(dir, candidateName);
    if (!(await fileExists(candidatePath))) {
      return { fileName: candidateName, filePath: candidatePath };
    }
    suffix++;
  }
}

// 主函数
async function main() {
  const startTime = Date.now();

  // 启动信息
  console.log();
  console.log(chalk.cyan.bold("  ⬡ Pixel Porter"));
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.grey(`  输入  ${config.inputDir}`));
  console.log(chalk.grey(`  输出  ${config.outputDir}`));
  console.log(chalk.grey(`  类型  ${config.fileTypes.join(", ")}`));
  console.log();

  // 扫描文件
  const files = await scanDirectory(config.inputDir, config.recursive);

  if (!files || files.length === 0) {
    console.log(chalk.red(`  ${messages.errors.noFiles}`));
    process.exit(0);
  }

  const totalFiles = files.length;
  console.log(`  扫描到 ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();

  // 创建输出目录（静默）
  if (!(await fileExists(config.outputDir))) {
    await mkdir(config.outputDir, { recursive: true });
  }

  // 创建日志目录（静默），如已存在则检查输出目录是否需要清空
  if (!(await fileExists(config.logsDir))) {
    await mkdir(config.logsDir, { recursive: true });
  } else {
    const outputFiles = await scanDirectory(config.outputDir);
    if (outputFiles && outputFiles.length > 0) {
      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "clear",
          message: messages.prompts.clearOutput,
        },
      ]);

      if (!answer.clear) {
        console.log(chalk.yellow(`  ${messages.warnings.notClearOutput}`));
        process.exit(0);
      }

      await clearDirectory(config.outputDir);
      console.log(chalk.green(`  ${messages.info.clearSuccess}`));
      console.log();
    }
  }

  // 处理文件
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let currentIndex = 0;
  const logData: any[] = [];
  const skippedData: { fileName: string; filePath: string; reason: string }[] = [];
  const padWidth = totalFiles.toString().length;

  for (const file of files) {
    currentIndex++;
    const idx = currentIndex.toString().padStart(padWidth, " ");
    const prefix = chalk.grey(`[${idx}/${totalFiles}]`);

    // 实时进度
    showProgress(currentIndex, totalFiles, basename(file));

    try {
      // 根据文件扩展名判断是否继续处理
      const ext = extname(file).toLowerCase().slice(1);
      if (!config.fileTypes.includes(ext)) {
        printResult(`  ${prefix} ${chalk.yellow("⊘")} ${chalk.grey(basename(file))} ${chalk.yellow("跳过")}`);
        skippedData.push({ fileName: basename(file), filePath: file, reason: `不支持的文件类型 (.${ext})` });
        skippedCount++;
        continue;
      }

      // 获取文件信息
      const fileInfo = await getFileInfo(file);

      // 获取 EXIF 信息
      const exifInfo = await getExifInfo(file);
      let timeSource = "文件时间";
      let exifDateTimeOriginal = null;
      let fileName = formatDate(fileInfo.createdAt);
      let finalTimeUsed = fileInfo.createdAt;

      if (exifInfo) {
        exifDateTimeOriginal = exifInfo.DateTimeOriginal || null;

        if (exifInfo.DateTimeOriginal) {
          fileName = exifInfo.DateTimeOriginal;
          timeSource = "EXIF拍摄";
          const exifTime = new Date(exifInfo.DateTimeOriginal);
          if (!isNaN(exifTime.getTime())) finalTimeUsed = exifTime;
        } else if (exifInfo.CreateDate) {
          fileName = exifInfo.CreateDate;
          timeSource = "EXIF创建";
          const exifTime = new Date(exifInfo.CreateDate);
          if (!isNaN(exifTime.getTime())) finalTimeUsed = exifTime;
        } else if (exifInfo.ModifyDate) {
          fileName = exifInfo.ModifyDate;
          timeSource = "EXIF修改";
          const exifTime = new Date(exifInfo.ModifyDate);
          if (!isNaN(exifTime.getTime())) finalTimeUsed = exifTime;
        }
      }

      const { fileName: newFileName, filePath: newFilePath } = await getUniqueFilePath(config.outputDir, fileName, ext);

      await copyFileTo(file, newFilePath);

      printResult(
        `  ${prefix} ${chalk.green("✓")} ${basename(file)} ${chalk.grey("→")} ${chalk.white(newFileName)} ${chalk.grey(`[${timeSource}]`)}`,
      );
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
        newFilePath: newFilePath,
      });
    } catch (error) {
      printResult(`  ${prefix} ${chalk.red("✗")} ${basename(file)} ${chalk.red((error as Error).message)}`);
      errorCount++;
    }
  }

  // 清除最后的进度条
  clearLine();

  // 耗时计算
  const elapsed = Date.now() - startTime;
  const elapsedStr =
    elapsed < 1000
      ? `${elapsed}ms`
      : `${(elapsed / 1000).toFixed(1)}s`;

  // 完成摘要
  console.log();
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.cyan.bold("  处理完成") + chalk.grey(`  耗时 ${elapsedStr}`));
  console.log();
  console.log(`  ${renderProgressBar(totalFiles, totalFiles)}`);
  console.log();
  if (processedCount > 0)
    console.log(`  ${chalk.green("✓")} 成功  ${chalk.green.bold(processedCount.toString())} 个文件`);
  if (skippedCount > 0)
    console.log(`  ${chalk.yellow("⊘")} 跳过  ${chalk.yellow.bold(skippedCount.toString())} 个文件`);
  if (errorCount > 0)
    console.log(`  ${chalk.red("✗")} 失败  ${chalk.red.bold(errorCount.toString())} 个文件`);
  console.log(`  ${chalk.white("合计")}  ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();

  // 生成 Markdown 格式的日志内容
  const generateMarkdownLog = (data: any[]): string => {
    let markdown = `# 文件处理日志\n\n`;
    markdown += `生成时间: ${new Date().toLocaleString()}\n`;
    markdown += `处理耗时: ${elapsedStr}\n`;
    markdown += `成功处理: ${processedCount} 个文件\n`;
    markdown += `跳过处理: ${skippedCount} 个文件\n`;
    markdown += `处理失败: ${errorCount} 个文件\n`;
    markdown += `总计: ${files.length} 个文件\n\n`;

    markdown += `## 成功处理的文件\n\n`;
    markdown += `| 原始文件名 | 文件大小 | 创建日期 | EXIF拍摄时间 | 时间来源 | 最终使用时间 | 新文件名 |\n`;
    markdown += `|----------|---------|---------|-------------|---------|-------------|---------|\n`;

    data.forEach((item) => {
      markdown += `| ${item.originalFileName} | ${item.fileSizeMB} MB | ${item.creationDateLocal} | ${item.exifDateTimeOriginal || "-"} | ${item.timeSource} | ${item.finalTimeUsedLocal} | ${item.newFileName} |\n`;
    });

    if (skippedData.length > 0) {
      markdown += `\n## 跳过的文件\n\n`;
      markdown += `| 文件名 | 文件路径 | 跳过原因 |\n`;
      markdown += `|-------|---------|----------|\n`;

      skippedData.forEach((item) => {
        markdown += `| ${item.fileName} | ${item.filePath} | ${item.reason} |\n`;
      });
    }

    return markdown;
  };

  // 导出日志文件
  if (logData.length > 0 || skippedData.length > 0) {
    const logFileName = `file_processing_log_${formatDate(new Date())}.md`;
    const logFilePath = join(config.logsDir, logFileName);

    try {
      const markdownContent = generateMarkdownLog(logData);
      await writeFile(logFilePath, markdownContent, "utf8");
      console.log(chalk.grey(`  日志已保存: ${logFileName}`));
      console.log();
    } catch (error) {
      console.log(chalk.red(`  日志导出失败: ${(error as Error).message}`));
      console.log();
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
