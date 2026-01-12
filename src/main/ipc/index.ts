import { ipcMain } from 'electron';

// IPC 通道定义
export const IPC_CHANNELS = {
  // 文件操作
  FILE_SELECT: 'file:select',
  FILE_SELECT_FOLDER: 'file:select-folder',
  
  // 配置管理
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
} as const;

// 注册 IPC 处理器
export function registerIpcHandlers() {
  // 文件选择
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async () => {
    // TODO: 实现文件选择逻辑
    return [];
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_FOLDER, async () => {
    // TODO: 实现文件夹选择逻辑
    return [];
  });

  // 配置管理
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async (_, key: string) => {
    // TODO: 实现配置读取逻辑
    console.log('Config get:', key);
    return null;
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_, key: string, value: unknown) => {
    // TODO: 实现配置保存逻辑
    console.log('Config set:', key, value);
    return true;
  });
}

