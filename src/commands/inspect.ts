import { basename, extname, join } from "node:path";
import { stat, mkdir, writeFile } from "node:fs/promises";
import chalk from "chalk";

import { scanDirectory, fileExists } from "../scripts/file.ts";
import { getExifInfo } from "../scripts/exif.ts";
import { formatDate } from "../scripts/time.ts";
import {
  renderProgressBar,
  clearLine,
  showProgress,
  printResult,
  formatElapsed,
} from "../scripts/progress.ts";
import type { AppConfig } from "../types/App.ts";

// 单个文件的检查结果
interface FileInspectResult {
  fileName: string;
  filePath: string;
  fileSize: string;
  ext: string;
  birthtime: Date;
  mtime: Date;
  exifDateTimeOriginal: string | null;
  exifCreateDate: string | null;
  exifModifyDate: string | null;
  isBirthtimeMtimeSync: boolean;
  isExifSync: boolean;
  hasExif: boolean;
  issues: string[];
}

// 比较两个时间是否一致（精确到秒）
function isSameTime(a: Date, b: Date): boolean {
  return Math.floor(a.getTime() / 1000) === Math.floor(b.getTime() / 1000);
}

// 尝试将 EXIF 格式的时间字符串解析为 Date
function parseExifTime(exifStr: string): Date | null {
  // exifStr 格式为 YYYYMMDD_HHmmssSSS（formatDate 的输出格式）
  const match = exifStr.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(+y, +mo - 1, +d, +h, +mi, +s);
  return isNaN(date.getTime()) ? null : date;
}

// 格式化时间用于显示
function fmtTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// 格式化 EXIF 时间字符串用于显示（YYYYMMDD_HHmmssSSS → YYYY/MM/DD HH:mm:ss）
function fmtExifStr(exifStr: string | null): string {
  if (!exifStr) return "-";
  const match = exifStr.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) return exifStr;
  const [, y, mo, d, h, mi, s] = match;
  return `${y}/${mo}/${d} ${h}:${mi}:${s}`;
}

/** 文件信息检查功能 */
export async function inspect(config: AppConfig): Promise<void> {
  const startTime = Date.now();

  // 启动信息
  console.log();
  console.log(chalk.cyan.bold("  ⬡ Pixel Porter - 文件检查"));
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.grey(`  目录      ${config.inputDir}`));
  console.log(chalk.grey(`  递归扫描  ${config.recursive ? "是" : "否"}`));
  console.log(chalk.grey(`  类型      ${config.fileTypes.join(", ")}`));
  console.log();

  // 检查目录是否存在
  if (!(await fileExists(config.inputDir))) {
    console.log(chalk.red(`  目标目录不存在: ${config.inputDir}`));
    return;
  }

  // 扫描文件
  const files = await scanDirectory(config.inputDir, config.recursive);

  if (!files || files.length === 0) {
    console.log(chalk.red("  目录中没有文件"));
    return;
  }

  const totalFiles = files.length;
  console.log(`  扫描到 ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();

  // 检查文件
  const results: FileInspectResult[] = [];
  let currentIndex = 0;
  let errorCount = 0;
  const padWidth = totalFiles.toString().length;

  for (const file of files) {
    currentIndex++;
    const idx = currentIndex.toString().padStart(padWidth, " ");
    const prefix = chalk.grey(`[${idx}/${totalFiles}]`);

    showProgress(currentIndex, totalFiles, basename(file));

    try {
      const fileStat = await stat(file);
      const ext = extname(file).toLowerCase().slice(1);
      const birthtime = fileStat.birthtime;
      const mtime = fileStat.mtime;

      // 获取 EXIF 信息（仅对支持的媒体文件）
      let exifDateTimeOriginal: string | null = null;
      let exifCreateDate: string | null = null;
      let exifModifyDate: string | null = null;
      let hasExif = false;

      const mediaExts = config.fileTypes;
      if (mediaExts.includes(ext)) {
        const exifInfo = await getExifInfo(file);
        if (exifInfo) {
          hasExif = true;
          exifDateTimeOriginal = exifInfo.DateTimeOriginal || null;
          exifCreateDate = exifInfo.CreateDate || null;
          exifModifyDate = exifInfo.ModifyDate || null;
        }
      }

      // 检查时间一致性
      const issues: string[] = [];

      const isBirthtimeMtimeSync = isSameTime(birthtime, mtime);
      if (!isBirthtimeMtimeSync) {
        issues.push("创建时间 ≠ 修改时间");
      }

      // 确定用于对比的 EXIF 时间（优先级：DateTimeOriginal > CreateDate > ModifyDate）
      const exifTimeStr = exifDateTimeOriginal || exifCreateDate || exifModifyDate;
      const exifTimeLabel = exifDateTimeOriginal
        ? "EXIF拍摄时间"
        : exifCreateDate
          ? "EXIF创建时间"
          : exifModifyDate
            ? "EXIF修改时间"
            : null;

      let isExifSync = true;
      if (exifTimeStr && exifTimeLabel) {
        const exifTime = parseExifTime(exifTimeStr);
        if (exifTime) {
          if (!isSameTime(birthtime, exifTime)) {
            isExifSync = false;
            issues.push(`创建时间 ≠ ${exifTimeLabel}`);
          }
          if (!isSameTime(mtime, exifTime)) {
            isExifSync = false;
            issues.push(`修改时间 ≠ ${exifTimeLabel}`);
          }
        }
      } else if (mediaExts.includes(ext)) {
        // 媒体文件没有任何 EXIF 时间数据，无法验证
        isExifSync = false;
        issues.push("无EXIF时间数据");
      }

      const result: FileInspectResult = {
        fileName: basename(file),
        filePath: file,
        fileSize: (fileStat.size / 1024 / 1024).toFixed(2),
        ext,
        birthtime,
        mtime,
        exifDateTimeOriginal,
        exifCreateDate,
        exifModifyDate,
        isBirthtimeMtimeSync,
        isExifSync,
        hasExif,
        issues,
      };

      results.push(result);

      // 输出结果
      if (issues.length > 0) {
        printResult(`  ${prefix} ${chalk.yellow("⚠")} ${basename(file)} ${chalk.yellow(issues.join(", "))}`);
      } else {
        printResult(`  ${prefix} ${chalk.green("✓")} ${chalk.grey(basename(file))}`);
      }
    } catch (error) {
      printResult(`  ${prefix} ${chalk.red("✗")} ${basename(file)} ${chalk.red((error as Error).message)}`);
      errorCount++;
    }
  }

  clearLine();

  // 统计
  const syncFiles = results.filter((r) => r.issues.length === 0);
  const unsyncFiles = results.filter((r) => r.issues.length > 0);
  const elapsedStr = formatElapsed(startTime);

  // 完成摘要
  console.log();
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.cyan.bold("  检查完成") + chalk.grey(`  耗时 ${elapsedStr}`));
  console.log();
  console.log(`  ${renderProgressBar(totalFiles, totalFiles)}`);
  console.log();
  console.log(`  ${chalk.green("✓")} 时间一致  ${chalk.green.bold(syncFiles.length.toString())} 个文件`);
  if (unsyncFiles.length > 0)
    console.log(`  ${chalk.yellow("⚠")} 时间不一致  ${chalk.yellow.bold(unsyncFiles.length.toString())} 个文件`);
  if (errorCount > 0)
    console.log(`  ${chalk.red("✗")} 检查失败  ${chalk.red.bold(errorCount.toString())} 个文件`);
  console.log(`  ${chalk.white("合计")}      ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();

  // 生成报告
  const markdown = generateReport(results, unsyncFiles, syncFiles, errorCount, totalFiles, elapsedStr, config.inputDir);

  // 保存报告
  if (!(await fileExists(config.logsDir))) {
    await mkdir(config.logsDir, { recursive: true });
  }

  const reportFileName = `file_inspect_report_${formatDate(new Date())}.md`;
  const reportFilePath = join(config.logsDir, reportFileName);

  try {
    await writeFile(reportFilePath, markdown, "utf8");
    console.log(chalk.grey(`  报告已保存: ${reportFileName}`));
    console.log();
  } catch (error) {
    console.log(chalk.red(`  报告导出失败: ${(error as Error).message}`));
    console.log();
  }
}

// 生成 Markdown 报告
function generateReport(
  allFiles: FileInspectResult[],
  unsyncFiles: FileInspectResult[],
  syncFiles: FileInspectResult[],
  errorCount: number,
  totalFiles: number,
  elapsedStr: string,
  targetDir: string,
): string {
  let md = "";

  md += `# 文件检查报告\n\n`;
  md += `生成时间: ${new Date().toLocaleString()}\n`;
  md += `检查目录: ${targetDir}\n`;
  md += `检查耗时: ${elapsedStr}\n\n`;
  md += `| 统计项 | 数量 |\n`;
  md += `|--------|------|\n`;
  md += `| 时间一致 | ${syncFiles.length} |\n`;
  md += `| 时间不一致 | ${unsyncFiles.length} |\n`;
  md += `| 检查失败 | ${errorCount} |\n`;
  md += `| 总计 | ${totalFiles} |\n\n`;

  // 时间不一致的文件
  if (unsyncFiles.length > 0) {
    md += `## ⚠ 时间不一致的文件\n\n`;
    md += `| 文件名 | 大小 | 创建时间 | 修改时间 | EXIF拍摄时间 | EXIF创建时间 | EXIF修改时间 | 问题 |\n`;
    md += `|--------|------|----------|----------|-------------|-------------|-------------|------|\n`;

    for (const f of unsyncFiles) {
      md += `| ${f.fileName} | ${f.fileSize} MB | ${fmtTime(f.birthtime)} | ${fmtTime(f.mtime)} | ${fmtExifStr(f.exifDateTimeOriginal)} | ${fmtExifStr(f.exifCreateDate)} | ${fmtExifStr(f.exifModifyDate)} | ${f.issues.join("; ")} |\n`;
    }

    md += `\n`;
  }

  // 全部文件概览
  md += `## 全部文件\n\n`;
  md += `| # | 文件名 | 扩展名 | 大小 | 创建时间 | 修改时间 | EXIF拍摄时间 | EXIF创建时间 | EXIF修改时间 | 状态 |\n`;
  md += `|---|--------|--------|------|----------|----------|-------------|-------------|-------------|------|\n`;

  allFiles.forEach((f, i) => {
    const status = f.issues.length > 0 ? `⚠ ${f.issues.join("; ")}` : "✓";
    md += `| ${i + 1} | ${f.fileName} | .${f.ext} | ${f.fileSize} MB | ${fmtTime(f.birthtime)} | ${fmtTime(f.mtime)} | ${fmtExifStr(f.exifDateTimeOriginal)} | ${fmtExifStr(f.exifCreateDate)} | ${fmtExifStr(f.exifModifyDate)} | ${status} |\n`;
  });

  return md;
}
