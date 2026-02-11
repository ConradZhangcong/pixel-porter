import inquirer from "inquirer";
import chalk from "chalk";

import { getConfig } from "./scripts/config.ts";
import { rename } from "./commands/rename.ts";
import { syncTime } from "./commands/sync-time.ts";
import { inspect } from "./commands/inspect.ts";

// 加载配置
const config = await getConfig();

// 解析 CLI 子命令：第一个非 -- 开头的参数
function getSubCommand(): string | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (!arg.startsWith("-")) return arg;
  }
  return null;
}

// 交互式菜单
async function showMenu() {
  console.log();
  console.log(chalk.cyan.bold("  ⬡ Pixel Porter"));
  console.log(chalk.grey(`  ${"─".repeat(40)}`));
  console.log();

  const { command } = await inquirer.prompt([
    {
      type: "list",
      name: "command",
      message: "请选择要执行的功能",
      choices: [
        { name: "📁 文件重命名 — 根据 EXIF/创建时间重命名并复制文件", value: "rename" },
        { name: "🕐 时间同步   — 将文件创建时间同步为修改时间", value: "sync-time" },
        { name: "🔍 文件检查   — 检查文件时间信息并生成报告", value: "inspect" },
        new inquirer.Separator(),
        { name: "退出", value: "exit" },
      ],
    },
  ]);

  return command as string;
}

// 运行指定命令
async function runCommand(command: string) {
  switch (command) {
    case "rename":
      await rename(config);
      break;

    case "sync-time":
      await syncTime(config);
      break;

    case "inspect":
      await inspect(config);
      break;

    default:
      console.log(chalk.red(`  未知命令: ${command}`));
      console.log(chalk.grey("  可用命令: rename, sync-time, inspect"));
      process.exit(1);
  }
}

// 主入口
async function main() {
  const subCommand = getSubCommand();

  if (subCommand) {
    // CLI 直接指定了子命令
    if (subCommand === "exit") process.exit(0);
    await runCommand(subCommand);
  } else {
    // 无子命令，显示交互式菜单
    const command = await showMenu();
    if (command === "exit") process.exit(0);
    await runCommand(command);
  }
}

main().catch((error) => {
  console.error(chalk.red(`发生错误: ${error.message}`));
  process.exit(1);
});
