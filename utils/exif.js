const exifr = require("exifr");

/** 解析图片的exif信息 */
const getExifData = async (buffer) => {
  // 解析EXIF数据
  const exifData = await exifr.parse(buffer, {
    gps: true,
    // 显式指定需要提取的字段（可选，但可提高性能）
    pick: [
      "Make", // 相机品牌
      "Model", // 相机型号
      "LensModel", // 镜头型号
      "FNumber", // 光圈值
      "ExposureTime", // 曝光时间
      "ISO", // ISO感光度
      "FocalLength", // 焦距
      "FocalLengthIn35mmFormat", // 等效 35mm 焦距
      "DateTimeOriginal", // 拍摄时间
      "GPSLatitude", // 纬度
      "GPSLongitude", // 经度
    ],
  });

  console.log(exifData);

  return exifData;
};

const formatExifData = async (exifData) => {};

module.exports = {
  getExifData,
  formatExifData,
};
