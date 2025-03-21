# pixel-porter

像素搬运工

## 开发环境

- node 20.11.0
- pnpm 10.2.1

## 项目简介

1. 为图片添加EXIF信息的水印
2. 为图片添加EXIF信息
3. 通过EXIF信息为图片更改文件名

## EXIF 信息

EXIF（Exchangeable Image File Format）是嵌入在图像文件中的元数据，记录了拍摄时的各种参数和设备信息。

1. 相机信息

| 字段名    | 含义                   | 示例值          |
| :-------- | ---------------------- | --------------- |
| Make      | 相机制造商             | Canon           |
| Model     | 相机型号               | EOS R5          |
| Software  | 相机固件或后期处理软件 | Adobe Photoshop |
| Artist    | 摄影师或作者信息       | John Doe        |
| Copyright | 版权信息               | © 2023 John Doe |

2. 拍摄参数

| 字段名                | 含义                   | 示例值               |
| :-------------------- | ---------------------- | -------------------- |
| FNumber               | 光圈值（f/值）         | 2.8                  |
| ExposureTime          | 曝光时间（秒）         | 1/250                |
| ISO                   | ISO 感光度             | 400                  |
| FocalLength           | 焦距（毫米）           | 50                   |
| FocalLengthIn35mmFilm | 等效 35mm 焦距         | 75                   |
| ExposureMode          | 曝光模式（手动/自动）  | Manual               |
| ExposureProgram       | 曝光程序（如光圈优先） | Aperture Priority    |
| MeteringMode          | 测光模式（如点测光）   | Spot                 |
| Flash                 | 闪光灯状态             | Fired, Return detect |
| WhiteBalance          | 白平衡模式             | Auto                 |
| LightSource           | 光源类型               | Daylight             |

3. 镜头信息

| 字段名           | 含义       | 示例值           |
| :--------------- | ---------- | ---------------- |
| LensMake         | 镜头制造商 | Canon            |
| LensModel        | 镜头型号   | EF 24-70mm f/2.8 |
| LensSerialNumber | 镜头序列号 | 123456789        |
| MaxApertureValue | 最大光圈值 | 2.8              |

4. 日期和时间

| 字段名            | 含义               | 示例值              |
| :---------------- | ------------------ | ------------------- |
| DateTimeOriginal  | 拍摄日期和时间     | 2023:10:01 12:34:56 |
| DateTimeDigitized | 数字化日期和时间   | 2023:10:01 12:34:56 |
| DateTime          | 文件修改日期和时间 | 2023:10:01 12:34:56 |

5. GPS 信息

| 字段名          | 含义                 | 示例值     |
| :-------------- | -------------------- | ---------- |
| GPSLatitude     | 纬度                 | 34.0522    |
| GPSLongitude    | 经度                 | -118.2437  |
| GPSAltitude     | 海拔高度             | 100        |
| GPSSpeed        | 拍摄时的速度（km/h） | 60         |
| GPSImgDirection | 拍摄时的方向（度）   | 90         |
| GPSDateStamp    | GPS 日期             | 2023:10:01 |
| GPSTimeStamp    | GPS 时间             | 12:34:56   |

6. 图像属性

| 字段名         | 含义                 | 示例值              |
| :------------- | -------------------- | ------------------- |
| ImageWidth     | 图像宽度（像素）     | 6000                |
| ImageHeight    | 图像高度（像素）     | 4000                |
| Orientation    | 图像方向（旋转角度） | Horizontal (normal) |
| ResolutionUnit | 分辨率单位           | inches              |
| XResolution    | 水平分辨率（DPI）    | 300                 |
| YResolution    | 垂直分辨率（DPI）    | 300                 |
| ColorSpace     | 色彩空间             | sRGB                |
| BitsPerSample  | 每个颜色通道的位数   | 8                   |
| Compression    | 压缩方式             | JPEG                |

7. 其他信息

| 字段名               | 含义                 | 示例值                |
| :------------------- | -------------------- | --------------------- |
| SceneType            | 场景类型             | Directly photographed |
| FileSource           | 文件来源             | Digital Camera        |
| CustomRendered       | 自定义渲染（如 HDR） | Normal                |
| Contrast             | 对比度设置           | Normal                |
| Saturation           | 饱和度设置           | Normal                |
| Sharpness            | 锐度设置             | Normal                |
| SubjectDistanceRange | 拍摄距离范围         | Close                 |

8. 高级参数

| 字段名             | 含义                    | 示例值              |
| :----------------- | ----------------------- | ------------------- |
| ExposureBiasValue  | 曝光补偿值（EV）        | 0                   |
| BrightnessValue    | 亮度值                  | 5.5                 |
| ShutterSpeedValue  | 快门速度值（APEX 单位） | 7.5                 |
| ApertureValue      | 光圈值（APEX 单位）     | 3.5                 |
| SubjectArea        | 主体区域（坐标或范围）  | 2000 1500 1000 1000 |
| SubSecTimeOriginal | 拍摄时间的毫秒部分      | 123                 |

9. 特殊标记

| 字段名                  | 含义                         | 示例值        |
| :---------------------- | ---------------------------- | ------------- |
| MakerNote               | 相机厂商自定义数据（二进制） | (Binary Data) |
| UserComment             | 用户注释                     | 风景拍摄      |
| InteroperabilityIndex   | 互操作性索引                 | R98           |
| InteroperabilityVersion | 互操作性版本                 | 0100          |

10. 视频相关（部分相机支持）

| 字段名     | 含义         | 示例值   |
| :--------- | ------------ | -------- |
| Duration   | 视频时长     | 00:01:30 |
| FrameRate  | 帧率         | 30 fps   |
| VideoCodec | 视频编码格式 | H.264    |
