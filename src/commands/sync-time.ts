import { basename } from "node:path";
import { stat, utimes } from "node:fs/promises";
import chalk from "chalk";

import { scanDirectory, fileExists } from "../scripts/file.ts";
import {
  renderProgressBar,
  clearLine,
  showProgress,
  printResult,
  formatElapsed,
} from "../scripts/progress.ts";
import type { AppConfig } from "../types/App.ts";

/** 时间同步功能：将目录中所有文件的创建时间同步为修改时间（适用于 macOS） */
export async function syncTime(config: AppConfig): Promise<void> {
  const startTime = Date.now();

  // 启动信息
  console.log();
  console.log(chalk.cyan.bold("  ⬡ Pixel Porter - 时间同步"));
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.grey(`  目录      ${config.outputDir}`));
  console.log(chalk.grey(`  递归扫描  ${config.recursive ? "是" : "否"}`));
  console.log(chalk.grey(`  操作      创建时间 ← 修改时间`));
  console.log();

  // 检查目录是否存在
  if (!(await fileExists(config.outputDir))) {
    console.log(chalk.red(`  目标目录不存在: ${config.outputDir}`));
    return;
  }

  // 扫描文件
  const files = await scanDirectory(config.outputDir, config.recursive);

  if (!files || files.length === 0) {
    console.log(chalk.red("  目录中没有文件"));
    return;
  }

  const totalFiles = files.length;
  console.log(`  扫描到 ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();

  // 处理文件
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let currentIndex = 0;
  const padWidth = totalFiles.toString().length;

  for (const file of files) {
    currentIndex++;
    const idx = currentIndex.toString().padStart(padWidth, " ");
    const prefix = chalk.grey(`[${idx}/${totalFiles}]`);

    // 实时进度
    showProgress(currentIndex, totalFiles, basename(file));

    try {
      const fileStat = await stat(file);
      const birthtime = fileStat.birthtime;
      const mtime = fileStat.mtime;

      // 比较创建时间和修改时间（精确到秒）
      const birthSec = Math.floor(birthtime.getTime() / 1000);
      const mtimeSec = Math.floor(mtime.getTime() / 1000);

      if (birthSec === mtimeSec) {
        printResult(`  ${prefix} ${chalk.grey("─")} ${chalk.grey(basename(file))} ${chalk.grey("已一致, 跳过")}`);
        skippedCount++;
        continue;
      }

      // 将创建时间同步为修改时间
      // macOS 上，当 utimes 设置的 mtime < 当前 birthtime 时，内核会自动将 birthtime 下调为 mtime
      await utimes(file, fileStat.atime, mtime);

      const timeStr = mtime.toLocaleString();
      printResult(`  ${prefix} ${chalk.green("✓")} ${basename(file)} ${chalk.grey(`btime → ${timeStr}`)}`);
      syncedCount++;
    } catch (error) {
      printResult(`  ${prefix} ${chalk.red("✗")} ${basename(file)} ${chalk.red((error as Error).message)}`);
      errorCount++;
    }
  }

  // 清除最后的进度条
  clearLine();

  const elapsedStr = formatElapsed(startTime);

  // 完成摘要
  console.log();
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log(chalk.cyan.bold("  同步完成") + chalk.grey(`  耗时 ${elapsedStr}`));
  console.log();
  console.log(`  ${renderProgressBar(totalFiles, totalFiles)}`);
  console.log();
  if (syncedCount > 0)
    console.log(`  ${chalk.green("✓")} 已同步  ${chalk.green.bold(syncedCount.toString())} 个文件`);
  if (skippedCount > 0)
    console.log(`  ${chalk.grey("─")} 已一致  ${chalk.grey(skippedCount.toString())} 个文件`);
  if (errorCount > 0)
    console.log(`  ${chalk.red("✗")} 失败    ${chalk.red.bold(errorCount.toString())} 个文件`);
  console.log(`  ${chalk.white("合计")}    ${chalk.white.bold(totalFiles.toString())} 个文件`);
  console.log();
}
