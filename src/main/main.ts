import { app, BrowserWindow } from 'electron';
import { createWindow } from './window';
import { registerIpcHandlers, setMainWindow } from './ipc';

// 处理应用窗口的激活（macOS）
app.whenReady().then(() => {
  // 创建窗口
  const mainWindow = createWindow();
  
  // 设置主窗口引用
  setMainWindow(mainWindow);
  
  // 注册IPC处理器
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全设置：阻止新窗口创建和导航
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

