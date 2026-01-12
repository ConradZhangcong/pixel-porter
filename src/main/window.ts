import { BrowserWindow, screen, app } from 'electron';
import path from 'path';

// 判断是否为开发环境
const isDev = !app.isPackaged;

export function createWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    minWidth: 800,
    minHeight: 600,
    title: 'Pixel Porter',
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      // 编译后的 main.js 在 dist-electron/main/main.js
      // preload.js 在 dist-electron/preload/preload.js
      // 所以相对路径是 ../preload/preload.js
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // 加载应用
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

