#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pixel Porter - 媒体文件整理工具
功能：
1. 根据EXIF信息或创建时间重命名图片和视频
2. 保持媒体文件原有信息不变
3. 异常文件移动到未处理目录
4. 输出目录按日期组织
5. 记录变更日志
"""

import argparse
import configparser
import logging
import os
import shutil
from datetime import datetime

from hachoir.metadata import extractMetadata
from hachoir.parser import createParser
from PIL import Image
from PIL.ExifTags import TAGS
from tqdm import tqdm

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pixel_porter.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MediaSorter:
    def __init__(self, input_dir, output_dir):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.untreated_dir = os.path.join(output_dir, 'untreated')
        # 创建输出目录和未处理目录
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(self.untreated_dir, exist_ok=True)
        
    def get_media_metadata(self, file_path):
        """
        获取媒体文件的元数据，优先使用EXIF信息，其次使用文件创建时间
        确保所有返回的datetime对象都转换为东八区（UTC+8）时间
        """
        # 导入时区模块
        from datetime import timezone, timedelta
        
        # 定义东八区时区
        east_eight = timezone(timedelta(hours=8), name='UTC+8')
        
        # 检查是否为图片文件
        if self.is_image_file(file_path):
            try:
                with Image.open(file_path) as img:
                    exif_data = img._getexif()
                    if exif_data:
                        # 转换EXIF标签为可读格式
                        exif = {TAGS.get(tag, tag): value for tag, value in exif_data.items()}
                        # 尝试获取拍摄时间
                        if 'DateTimeOriginal' in exif:
                            try:
                                dt = datetime.strptime(exif['DateTimeOriginal'], '%Y:%m:%d %H:%M:%S')
                                # EXIF时间通常是拍摄设备所在时区的时间，直接视为东八区
                                return dt.replace(tzinfo=east_eight)
                            except ValueError:
                                pass
                        if 'DateTime' in exif:
                            try:
                                dt = datetime.strptime(exif['DateTime'], '%Y:%m:%d %H:%M:%S')
                                # EXIF时间通常是拍摄设备所在时区的时间，直接视为东八区
                                return dt.replace(tzinfo=east_eight)
                            except ValueError:
                                pass
            except Exception as e:
                logger.warning(f"无法读取图片{file_path}的EXIF信息: {e}")
        # 检查是否为视频文件
        elif self.is_video_file(file_path):
            try:
                # 使用hachoir解析视频文件
                parser = createParser(file_path)
                if parser:
                    with parser:
                        metadata = extractMetadata(parser)
                        if metadata:
                            # 尝试获取创建时间
                            if metadata.has('creation_date'):
                                creation_date = metadata.get('creation_date')
                                if creation_date:
                                    # 检查时间戳是否包含时区
                                    if hasattr(creation_date, 'tzinfo') and creation_date.tzinfo is not None:
                                        # 转换为东八区时间
                                        return creation_date.astimezone(east_eight)
                                    else:
                                        # 如果没有时区信息，假设为UTC时间并转换为东八区
                                        return creation_date.replace(tzinfo=timezone.utc).astimezone(east_eight)
                            elif metadata.has('date_time_original'):
                                date_time_original = metadata.get('date_time_original')
                                if date_time_original:
                                    # 检查时间戳是否包含时区
                                    if hasattr(date_time_original, 'tzinfo') and date_time_original.tzinfo is not None:
                                        # 转换为东八区时间
                                        return date_time_original.astimezone(east_eight)
                                    else:
                                        # 如果没有时区信息，假设为UTC时间并转换为东八区
                                        return date_time_original.replace(tzinfo=timezone.utc).astimezone(east_eight)
            except Exception as e:
                logger.warning(f"无法读取视频{file_path}的元数据: {e}")
        
        # 如果没有EXIF时间或视频元数据，使用文件创建时间
        try:
            # 对于macOS，使用os.stat获取birthtime（创建时间）
            stat_info = os.stat(file_path)
            try:
                # macOS和FreeBSD系统使用st_birthtime
                dt = datetime.fromtimestamp(stat_info.st_birthtime)
            except AttributeError:
                # Linux系统使用st_ctime
                dt = datetime.fromtimestamp(stat_info.st_ctime)
            # 假设文件创建时间是本地时间（东八区）
            return dt.replace(tzinfo=east_eight)
        except Exception as e:
            logger.warning(f"无法获取文件{file_path}的创建时间: {e}")
            return None
    
    def is_image_file(self, file_path):
        """
        检查文件是否为图片文件
        """
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.heic')
        return file_path.lower().endswith(image_extensions)
    
    def is_video_file(self, file_path):
        """
        检查文件是否为视频文件
        """
        video_extensions = ('.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm', '.mpeg', '.mpg')
        return file_path.lower().endswith(video_extensions)
    
    def is_media_file(self, file_path):
        """
        检查文件是否为媒体文件（图片或视频）
        """
        return self.is_image_file(file_path) or self.is_video_file(file_path)
    
    def process_media(self):
        """
        处理媒体文件
        """
        # 获取所有文件
        all_files = []
        for root, _, files in os.walk(self.input_dir):
            for file in files:
                # 过滤掉.DS_Store和.gitkeep文件
                if file == '.DS_Store' or file == '.gitkeep':
                    continue
                all_files.append(os.path.join(root, file))
        
        logger.info(f"找到{len(all_files)}个文件")
        
        # 过滤出媒体文件并获取元数据
        media_files = []
        for file_path in all_files:
            if self.is_media_file(file_path):
                timestamp = self.get_media_metadata(file_path)
                if timestamp:
                    media_files.append((file_path, timestamp))
                else:
                    # 无法获取时间信息的媒体文件移动到未处理目录
                    self.move_to_untreated(file_path)
            else:
                # 非媒体文件移动到未处理目录
                self.move_to_untreated(file_path)
        
        # 按时间排序
        media_files.sort(key=lambda x: x[1])
        
        logger.info(f"处理{len(media_files)}个媒体文件")
        
        # 创建日期目录（包含时分秒）和diff目录
        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        date_dir = os.path.join(self.output_dir, date_str)
        diff_dir = os.path.join(self.output_dir, 'diff', date_str)
        os.makedirs(date_dir, exist_ok=True)
        os.makedirs(diff_dir, exist_ok=True)
        
        # 重命名并移动媒体文件
        for idx, (file_path, timestamp) in enumerate(tqdm(media_files, desc="处理媒体文件"), 1):
            # 获取文件创建时间（用于对比）
            from datetime import timezone, timedelta
            east_eight = timezone(timedelta(hours=8), name='UTC+8')
            try:
                stat_info = os.stat(file_path)
                try:
                    # macOS和FreeBSD系统使用st_birthtime
                    file_creation_time = datetime.fromtimestamp(stat_info.st_birthtime).replace(tzinfo=east_eight)
                except AttributeError:
                    # Linux系统使用st_ctime
                    file_creation_time = datetime.fromtimestamp(stat_info.st_ctime).replace(tzinfo=east_eight)
            except Exception as e:
                logger.warning(f"无法获取文件{file_path}的创建时间: {e}")
                file_creation_time = None
            
            # 生成新文件名
            ext = os.path.splitext(file_path)[1].lower()
            base_filename = f"{timestamp.strftime('%Y%m%d_%H%M%S')}{ext}"
            
            # 比较时间戳和文件创建时间（只比较年月日时分秒，忽略毫秒）
            times_match = False
            if file_creation_time:
                times_match = (timestamp.strftime('%Y%m%d_%H%M%S') == 
                              file_creation_time.strftime('%Y%m%d_%H%M%S'))
            
            # 根据比较结果决定输出目录
            if times_match:
                output_dir = date_dir
            else:
                output_dir = diff_dir
            
            new_file_path = os.path.join(output_dir, base_filename)
            
            # 检查文件名是否已存在，如果存在则添加计数器
            if os.path.exists(new_file_path):
                counter = 1
                while True:
                    # 生成带计数器的新文件名
                    new_filename = f"{timestamp.strftime('%Y%m%d_%H%M%S')}_{counter}{ext}"
                    new_file_path = os.path.join(output_dir, new_filename)
                    
                    # 如果文件名不存在，跳出循环
                    if not os.path.exists(new_file_path):
                        break
                    
                    counter += 1
            else:
                # 如果不存在重名文件，直接使用基础文件名
                new_filename = base_filename
                new_file_path = os.path.join(output_dir, new_filename)
            
            # 复制文件（不改变原文件）
            try:
                shutil.copy2(file_path, new_file_path)
                logger.info(f"复制文件: {file_path} -> {new_file_path}")
            except Exception as e:
                logger.error(f"复制文件{file_path}失败: {e}")
                self.move_to_untreated(file_path)
    
    def move_to_untreated(self, file_path):
        """
        将文件移动到未处理目录
        """
        try:
            # 保持原文件名
            filename = os.path.basename(file_path)
            dest_path = os.path.join(self.untreated_dir, filename)
            
            # 检查文件名是否已存在
            counter = 1
            while os.path.exists(dest_path):
                name, ext = os.path.splitext(filename)
                dest_path = os.path.join(self.untreated_dir, f"{name}_{counter}{ext}")
                counter += 1
            
            shutil.copy2(file_path, dest_path)
            logger.info(f"移动文件到未处理目录: {file_path} -> {dest_path}")
        except Exception as e:
            logger.error(f"移动文件{file_path}到未处理目录失败: {e}")
    
    def run(self):
        """
        运行媒体文件整理工具
        """
        logger.info(f"开始整理媒体文件，输入目录: {self.input_dir}, 输出目录: {self.output_dir}")
        self.process_media()
        logger.info("媒体文件整理完成")

def main():
    parser = argparse.ArgumentParser(description='Pixel Porter - 图片整理工具')
    parser.add_argument('--input', '-i', help='输入目录路径')
    parser.add_argument('--output', '-o', help='输出目录路径')
    args = parser.parse_args()
    
    # 读取配置文件
    config = configparser.ConfigParser()
    config_file = os.path.join(os.path.dirname(__file__), 'config.ini')
    
    # 设置默认值
    default_input = None
    default_output = None
    
    # 如果配置文件存在，读取默认值
    if os.path.exists(config_file):
        config.read(config_file)
        if 'DEFAULT' in config:
            default_input = config['DEFAULT'].get('input')
            default_output = config['DEFAULT'].get('output')
    
    # 确定输入输出目录
    input_dir = args.input or default_input
    output_dir = args.output or default_output
    
    # 检查是否有输入输出目录
    if not input_dir or not output_dir:
        parser.error('必须提供输入和输出目录，或在config.ini中设置默认值')
    
    sorter = MediaSorter(input_dir, output_dir)
    sorter.run()

if __name__ == "__main__":
    main()