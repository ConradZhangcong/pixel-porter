/**
 * 提示语配置文件
 * 包含所有用户交互和日志提示的中文消息
 */

export const messages = {
  // 错误提示
  errors: {
    noFiles: "没有文件需要处理",
  },
  
  // 警告提示
  warnings: {
    notClearOutput: "用户选择不清空输出目录",
  },
  
  // 信息提示
  info: {
    clearSuccess: "清空输出目录成功",
    processComplete: "文件处理完成",
  },
  
  // 交互提示
  prompts: {
    clearOutput: "输出目录不为空，是否清空？",
  },
};
