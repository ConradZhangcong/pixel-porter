import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  selectFiles: () => ipcRenderer.invoke('file:select'),
  selectFolder: () => ipcRenderer.invoke('file:select-folder'),
  
  // 配置管理
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
});

// TypeScript 类型定义
export type ElectronAPI = {
  selectFiles: () => Promise<string[]>;
  selectFolder: () => Promise<string[]>;
  getConfig: (key: string) => Promise<unknown>;
  setConfig: (key: string, value: unknown) => Promise<boolean>;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

