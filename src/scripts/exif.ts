import exifr from "exifr";

import { formatDate } from "./time.ts";

import type { ExifData } from "../types/file.ts";

/**
 * 获取文件的EXIF信息
 * @param filePath 文件路径
 * @returns 文件的EXIF信息
 */
export const getExifInfo = async (filePath: string) => {
  try {
    const exifData = await exifr.parse(filePath, {
      // 提取需要的字段
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
        "Make",
        "Model",
        "FNumber",
        "ExposureTime",
        "ISO",
        "FocalLength",
        "ExposureMode",
        "WhiteBalance",
        "Flash",
        "MeteringMode",
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
      ],
    });

    if (exifData) {
      const formattedData: ExifData = {
        DateTimeOriginal: exifData.DateTimeOriginal
          ? formatDate(exifData.DateTimeOriginal)
          : undefined,
        CreateDate: exifData.CreateDate
          ? formatDate(exifData.CreateDate)
          : undefined,
        ModifyDate: exifData.ModifyDate
          ? formatDate(exifData.ModifyDate)
          : undefined,
        Make: exifData.Make,
        Model: exifData.Model,
        FNumber: exifData.FNumber,
        ExposureTime: exifData.ExposureTime,
        ISO: exifData.ISO,
        FocalLength: exifData.FocalLength,
        ExposureMode: exifData.ExposureMode,
        WhiteBalance: exifData.WhiteBalance,
        Flash: exifData.Flash,
        MeteringMode: exifData.MeteringMode,
        GPSLatitude: exifData.GPSLatitude,
        GPSLongitude: exifData.GPSLongitude,
        GPSAltitude: exifData.GPSAltitude,
      };

      return formattedData;
    }

    return null;
  } catch (error) {
    console.error("获取EXIF信息失败:", error);
    return null;
  }
};
