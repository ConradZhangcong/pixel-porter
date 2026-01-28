import { readFile } from "node:fs/promises";
import { join } from "node:path";
import defaultConfig from "../config.ts";
import { fileExists } from "./file.ts";
import type { AppConfig } from "../types/App.ts";

/** 解析命令行参数 */
const parseCommandLineArgs = (): Partial<AppConfig> => {
  const args = process.argv.slice(2);
  const config: Partial<AppConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // 支持 --key=value 格式
    if (arg.includes("=")) {
      const [key, ...valueParts] = arg.split("=");
      const keyName = key.replace(/^--?/, "");
      const value = valueParts.join("=");
      config[keyName as keyof AppConfig] = parseValue(value) as any;
    }
    // 支持 --key value 格式
    else if (arg.startsWith("--") || arg.startsWith("-")) {
      const keyName = arg.replace(/^--?/, "");
      const nextArg = args[i + 1];

      // 如果下一个参数不是以 -- 开头，则作为值
      if (nextArg && !nextArg.startsWith("--") && !nextArg.startsWith("-")) {
        config[keyName as keyof AppConfig] = parseValue(nextArg) as any;
        i++; // 跳过下一个参数，因为已经作为值使用了
      } else {
        // 布尔标志，设置为 true
        config[keyName as keyof AppConfig] = true as any;
      }
    }
  }

  return config;
};

/** 解析值，尝试转换为合适的类型 */
const parseValue = (value: string): string | boolean | number | string[] => {
  // 布尔值
  if (value === "true") return true;
  if (value === "false") return false;

  // 数字
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return Number.parseFloat(value);

  // 数组（逗号分隔）
  if (value.includes(",")) {
    return value.split(",").map((v) => v.trim());
  }

  // 字符串
  return value;
};

/** 从配置文件读取配置 */
const getConfigFromFile = async (): Promise<Partial<AppConfig>> => {
  const configPaths = [
    join(process.cwd(), "config.json"),
    join(process.cwd(), "config.jsonc"),
    join(process.cwd(), ".config.json"),
  ];

  for (const configPath of configPaths) {
    if (await fileExists(configPath)) {
      try {
        const content = await readFile(configPath, "utf-8");
        // 简单的 JSONC 支持：移除注释
        const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
        const config = JSON.parse(jsonContent) as Partial<AppConfig>;
        return config;
      } catch (error) {
        console.warn(`Failed to parse config file: ${configPath}`, error);
      }
    }
  }

  return {};
};

/** 合并配置，优先级：命令行参数 > 配置文件 > 默认配置 */
const mergeConfig = (
  defaultCfg: AppConfig,
  fileCfg: Partial<AppConfig>,
  argsCfg: Partial<AppConfig>,
): AppConfig => {
  return {
    ...defaultCfg,
    ...fileCfg,
    ...argsCfg,
  };
};

/** 获取配置（合并默认配置、配置文件和命令行参数） */
export const getConfig = async (): Promise<AppConfig> => {
  const argsConfig = parseCommandLineArgs();
  const fileConfig = await getConfigFromFile();
  return mergeConfig(defaultConfig, fileConfig, argsConfig);
};
