# Pixel Porter

`像素搬运工`

基于node开发的对图片处理工具

## 开发环境

- node 22.22.0
- pnpm 10.20.0

## 运行

```bash
pnpm install
# 直接使用node的实验性功能--experimental-transform-types运行node项目
pnpm dev
```

### 关于 node 运行原生 Typescript

`node 22.7.0` 开始支持原生运行 Typescript, 但是需要使用一个实验性 flag `--experimental-strip-types`, 从 `node 22.18.0` 开始, 就稳定无需使用这个 flag 了

```bash
node --experimental-strip-types index.ts
```

## 功能列表

### 批量文件重命名

根据一定规则对图片进行重命名

### 添加水印

### EXIF 信息修改
