const exifr = require("exifr");
const { Jimp } = require("jimp");
const fs = require("fs").promises;

async function getExifData(imagePath) {
  try {
    const buffer = await fs.readFile(imagePath);
    const exifData = await exifr.parse(buffer, {
      pick: [
        "Make", // 相机品牌
        "Model", // 相机型号
        "LensModel", // 镜头型号
        "FNumber", // 光圈值
        "ExposureTime", // 曝光时间
        "ISO", // ISO感光度
        "FocalLength", // 焦距
        "DateTimeOriginal", // 拍摄时间
        "GPSLatitude", // 纬度
        "GPSLongitude", // 经度
      ],
      gps: true, // 启用GPS解析
    });

    // 格式化GPS坐标
    const formatGPS = (gps) => {
      if (!gps) return "未知位置";
      const lat = gps.latitude;
      const lon = gps.longitude;
      const latDir = lat >= 0 ? "N" : "S";
      const lonDir = lon >= 0 ? "E" : "W";
      return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(
        4
      )}° ${lonDir}`;
    };

    return {
      make: exifData.Make || "未知品牌",
      model: exifData.Model || "未知型号",
      lens: exifData.LensModel || "未知镜头",
      aperture: exifData.FNumber ? `f/${exifData.FNumber}` : "未知",
      exposure: exifData.ExposureTime ? `${exifData.ExposureTime}s` : "未知",
      iso: exifData.ISO || "未知",
      focalLength: exifData.FocalLength ? `${exifData.FocalLength}mm` : "未知",
      date: exifData.DateTimeOriginal || "未知时间",
      gps: formatGPS(exifData), // 格式化后的GPS信息
    };
  } catch (error) {
    console.error("读取EXIF失败:", error.message);
    return null;
  }
}

async function addExifTextToImage(imagePath, outputPath) {
  try {
    // 获取EXIF数据
    const exifData = await getExifData(imagePath);
    if (!exifData) {
      throw new Error("无法获取EXIF数据");
    }

    // 格式化EXIF信息
    const exifText = `
      相机: ${exifData.make} ${exifData.model}
      镜头: ${exifData.lens}
      光圈: ${exifData.aperture}
      曝光: ${exifData.exposure}
      ISO: ${exifData.iso}
      焦距: ${exifData.focalLength}
      时间: ${exifData.date}
      位置: ${exifData.gps}
    `;

    // 加载图片
    const image = await Jimp.read(imagePath);

    // 设置字体
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // 计算文字区域高度
    const textHeight = Jimp.measureTextHeight(
      font,
      exifText,
      image.bitmap.width
    );

    // 扩展画布以容纳文字
    const newHeight = image.bitmap.height + textHeight + 40; // 40为上下边距
    const newImage = new Jimp(image.bitmap.width, newHeight, 0xffffffff); // 白色背景
    newImage.composite(image, 0, 0); // 将原图粘贴到新画布顶部

    // 添加文字
    newImage.print(
      font,
      20, // 左边距
      image.bitmap.height + 20, // 文字起始位置（原图下方）
      exifText,
      image.bitmap.width - 40 // 文字区域宽度
    );

    // 保存图片
    await newImage.writeAsync(outputPath);
    console.log("图片已保存:", outputPath);
  } catch (error) {
    console.error(error);
    console.error("处理图片失败:", error.message);
  }
}

// 使用示例
addExifTextToImage("./images/DSCF2473.jpg", "./images/DSCF2473_exif.jpg");
