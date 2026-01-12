#!/usr/bin/env node

/**
 * 修复 Electron 在 pnpm 下的安装问题
 * 这个脚本确保 Electron 的二进制文件正确安装
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 正在修复 Electron 安装...');

try {
  // 查找 electron 包的位置
  const electronPath = path.join(__dirname, '../node_modules/electron');
  
  if (fs.existsSync(electronPath)) {
    console.log('📦 找到 Electron 包，正在重新安装二进制文件...');
    
    // 运行 electron 的安装脚本
    const installScript = path.join(electronPath, 'install.js');
    if (fs.existsSync(installScript)) {
      execSync(`node "${installScript}"`, {
        stdio: 'inherit',
        cwd: electronPath,
      });
      console.log('✅ Electron 二进制文件安装成功！');
    } else {
      console.log('⚠️  未找到 Electron 安装脚本，尝试使用 pnpm 重新安装...');
      execSync('pnpm install --force', { stdio: 'inherit' });
    }
  } else {
    console.log('⚠️  Electron 包未找到，正在重新安装...');
    execSync('pnpm install electron --save-dev', { stdio: 'inherit' });
  }
  
  console.log('✅ Electron 修复完成！');
} catch (error) {
  console.error('❌ 修复失败:', error.message);
  console.log('\n💡 请尝试以下步骤：');
  console.log('1. 删除 node_modules 和 pnpm-lock.yaml');
  console.log('2. 运行: pnpm install');
  console.log('3. 如果问题仍然存在，运行: pnpm add -D electron@latest');
  process.exit(1);
}

