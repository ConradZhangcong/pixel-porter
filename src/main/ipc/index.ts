import { ipcMain, dialog, BrowserWindow } from 'electron';
import { FileRenameService } from '../../core/services/file-rename.service';
import { FileInfo, NamingRuleConfig, RenameOptions } from '../../shared/types';
import { SUPPORTED_IMAGE_FORMATS } from '../../shared/constants';

// IPC 通道定义
export const IPC_CHANNELS = {
  // 文件操作
  FILE_SELECT: 'file:select',
  FILE_SELECT_FOLDER: 'file:select-folder',
  
  // 文件重命名
  RENAME_SCAN_FOLDER: 'rename:scan-folder',
  RENAME_GET_FILES_INFO: 'rename:get-files-info',
  RENAME_GENERATE_PREVIEW: 'rename:generate-preview',
  RENAME_EXECUTE: 'rename:execute',
  RENAME_CANCEL: 'rename:cancel',
  
  // 配置管理
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
} as const;

// 文件重命名服务实例
let renameService: FileRenameService | null = null;

function getRenameService(): FileRenameService {
  if (!renameService) {
    renameService = new FileRenameService();
  }
  return renameService;
}

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

// 设置主窗口引用
export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

// 注册 IPC 处理器
export function registerIpcHandlers() {

  // 文件选择
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async () => {
    const window = mainWindow || BrowserWindow.getAllWindows()[0];
    if (!window) {
      return [];
    }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: '图片文件',
          extensions: SUPPORTED_IMAGE_FORMATS as any,
        },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_SELECT_FOLDER, async () => {
    const window = mainWindow || BrowserWindow.getAllWindows()[0];
    if (!window) {
      return [];
    }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    });

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  // 文件重命名相关
  ipcMain.handle(
    IPC_CHANNELS.RENAME_SCAN_FOLDER,
    async (_, folderPath: string, recursive: boolean = false) => {
      const service = getRenameService();
      const files = await service.scanFolder(folderPath, recursive);
      // 将Date对象序列化
      return files.map((f) => ({
        ...f,
        createTime: f.createTime?.toISOString(),
        modifyTime: f.modifyTime?.toISOString(),
      }));
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RENAME_GET_FILES_INFO,
    async (_, filePaths: string[]) => {
      const service = getRenameService();
      const files = await service.getFilesInfo(filePaths);
      return files.map((f) => ({
        ...f,
        createTime: f.createTime?.toISOString(),
        modifyTime: f.modifyTime?.toISOString(),
      }));
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RENAME_GENERATE_PREVIEW,
    async (_, files: FileInfo[], config: NamingRuleConfig) => {
      const service = getRenameService();
      // 将序列化的Date字符串转换回Date对象
      const fileInfos: FileInfo[] = files.map((f) => ({
        ...f,
        createTime: f.createTime ? new Date(f.createTime as any) : undefined,
        modifyTime: f.modifyTime ? new Date(f.modifyTime as any) : undefined,
      }));

      const result = await service.generatePreview(fileInfos, config);
      return {
        ...result,
        previews: result.previews.map((p) => ({
          ...p,
          fileInfo: {
            ...p.fileInfo,
            createTime: p.fileInfo.createTime?.toISOString(),
            modifyTime: p.fileInfo.modifyTime?.toISOString(),
          },
        })),
        conflicts: result.conflicts.map((c) => ({
          ...c,
          fileInfo: {
            ...c.fileInfo,
            createTime: c.fileInfo.createTime?.toISOString(),
            modifyTime: c.fileInfo.modifyTime?.toISOString(),
          },
        })),
      };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.RENAME_EXECUTE,
    async (_, previews: any[], options: RenameOptions) => {
      const service = getRenameService();

      // 设置进度监听
      const progressHandler = (progress: any) => {
        const window = mainWindow || BrowserWindow.getAllWindows()[0];
        if (window && !window.isDestroyed()) {
          window.webContents.send('rename:progress', progress);
        }
      };

      service.on('progress', progressHandler);

      try {
        // 将序列化的Date字符串转换回Date对象
        const previewItems = previews.map((p) => ({
          ...p,
          fileInfo: {
            ...p.fileInfo,
            createTime: p.fileInfo.createTime
              ? new Date(p.fileInfo.createTime)
              : undefined,
            modifyTime: p.fileInfo.modifyTime
              ? new Date(p.fileInfo.modifyTime)
              : undefined,
          },
        }));

        const result = await service.executeRename(previewItems, options);
        return result;
      } finally {
        service.off('progress', progressHandler);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.RENAME_CANCEL, async () => {
    const service = getRenameService();
    service.cancel();
    return true;
  });

  // 配置管理
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async (_, key: string) => {
    // TODO: 实现配置读取逻辑（使用electron-store）
    console.log('Config get:', key);
    return null;
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, async (_, key: string, value: unknown) => {
    // TODO: 实现配置保存逻辑（使用electron-store）
    console.log('Config set:', key, value);
    return true;
  });
}

