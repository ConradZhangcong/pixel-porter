import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  selectFiles: () => ipcRenderer.invoke('file:select'),
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  
  // 文件重命名
  renameScanFolder: (folderPath: string, recursive?: boolean) =>
    ipcRenderer.invoke('rename:scan-folder', folderPath, recursive),
  renameGetFilesInfo: (filePaths: string[]) =>
    ipcRenderer.invoke('rename:get-files-info', filePaths),
  renameGeneratePreview: (files: any[], config: any) =>
    ipcRenderer.invoke('rename:generate-preview', files, config),
  renameExecute: (previews: any[], options: any) =>
    ipcRenderer.invoke('rename:execute', previews, options),
  renameCancel: () => ipcRenderer.invoke('rename:cancel'),
  onRenameProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('rename:progress', (_, progress) => callback(progress));
  },
  offRenameProgress: () => {
    ipcRenderer.removeAllListeners('rename:progress');
  },
  
  // 配置管理
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
});

// TypeScript 类型定义
export type ElectronAPI = {
  selectFiles: () => Promise<string[]>;
  selectFolder: () => Promise<string[]>;
  renameScanFolder: (folderPath: string, recursive?: boolean) => Promise<any[]>;
  renameGetFilesInfo: (filePaths: string[]) => Promise<any[]>;
  renameGeneratePreview: (files: any[], config: any) => Promise<any>;
  renameExecute: (previews: any[], options: any) => Promise<any>;
  renameCancel: () => Promise<boolean>;
  onRenameProgress: (callback: (progress: any) => void) => void;
  offRenameProgress: () => void;
  getConfig: (key: string) => Promise<unknown>;
  setConfig: (key: string, value: unknown) => Promise<boolean>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

