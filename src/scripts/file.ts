import {
  readdir,
  stat,
  rename,
  copyFile,
  utimes,
  chmod,
  access,
  rm,
} from "node:fs/promises";
import { join } from "node:path";

import type { FileInfo } from "../types/file.ts";

// #region 文件操作

/**
 * 获取文件信息
 * @param filePath 文件路径
 * @returns 文件信息
 */
export const getFileInfo = async (filePath: string): Promise<FileInfo> => {
  const statInfo = await stat(filePath);

  return {
    filePath,
    size: statInfo.size,
    createdAt: statInfo.birthtime,
    updatedAt: statInfo.mtime,
  };
};

/**
 * 重命名文件
 * @param filePath 文件路径
 * @param newFilePath 新的文件路径
 */
export const renameFile = async (
  filePath: string,
  newFilePath: string,
): Promise<void> => {
  await rename(filePath, newFilePath);
};

/**
 * 复制文件并保留元数据（时间戳、权限等）
 * @param filePath 源文件路径
 * @param newFilePath 目标文件路径
 */
export const copyFileTo = async (
  filePath: string,
  newFilePath: string,
): Promise<void> => {
  // 获取源文件的元数据
  const sourceStat = await stat(filePath);

  // 复制文件内容
  await copyFile(filePath, newFilePath);

  // 保留文件的访问时间和修改时间
  await utimes(newFilePath, sourceStat.atime, sourceStat.mtime);

  // 保留文件权限
  await chmod(newFilePath, sourceStat.mode);
};

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns 文件是否存在
 */
export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

// #endregion

// #region 目录操作

/**
 * 扫描目录下的所有文件
 * @param directory 扫描的目录
 * @param recursive 是否递归扫描
 * @returns 扫描到的文件列表
 */
export const scanDirectory = async (
  directory: string,
  recursive: boolean = false,
): Promise<string[]> => {
  const files = await readdir(directory);
  const result: string[] = [];

  for (const file of files) {
    const filePath = join(directory, file);

    // 忽略DS_Store文件
    if (file === ".DS_Store") {
      continue;
    }

    // 判断是否是目录
    const statInfo = await stat(filePath);

    if (statInfo.isDirectory()) {
      // 如果是目录，则根据recursive参数判断是否递归扫描目录下的文件
      if (recursive) {
        const subFiles = await scanDirectory(filePath, recursive);
        result.push(...subFiles);
      }
    } else {
      // 如果是文件，则直接添加到结果列表
      result.push(filePath);
    }
  }

  return result;
};

/**
 * 清空目录内容
 * @param dirPath 目录路径
 */
export const clearDirectory = async (dirPath: string): Promise<void> => {
  try {
    const dirStat = await stat(dirPath);

    if (dirStat.isDirectory()) {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        await rm(entryPath, { recursive: true, force: true });
      }
    }
  } catch {
    // 目录不存在，忽略错误
  }
};

// #endregion
