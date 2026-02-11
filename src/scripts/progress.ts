import chalk from "chalk";

/** 进度条渲染 */
export function renderProgressBar(current: number, total: number, width = 25): string {
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const percent = Math.round(ratio * 100);
  const bar = chalk.green("█".repeat(filled)) + chalk.grey("░".repeat(empty));
  return `${bar} ${chalk.white.bold(`${percent}%`)} ${chalk.grey(`(${current}/${total})`)}`;
}

/** 清除当前行并重置光标 */
export function clearLine() {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

/** 显示实时进度 */
export function showProgress(current: number, total: number, fileName: string) {
  clearLine();
  const truncatedName = fileName.length > 30 ? fileName.slice(0, 27) + "..." : fileName;
  process.stdout.write(`  ${renderProgressBar(current, total)}  ${chalk.grey(truncatedName)}`);
}

/** 打印一行结果（先清除进度条再打印） */
export function printResult(line: string) {
  clearLine();
  console.log(line);
}

/** 计算耗时并格式化 */
export function formatElapsed(startTime: number): string {
  const elapsed = Date.now() - startTime;
  return elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;
}
