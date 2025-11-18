#!/usr/bin/env python3
"""
根据文件名称修改文件创建时间和更新时间的脚本

该脚本可以批量处理文件，根据文件名中的时间信息来修改文件的创建时间和更新时间。
支持的文件名格式示例：20241224_074052.jpg、20250623_195415.png等
"""

import os
import sys
import re
import argparse
import logging
import configparser
import shutil
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_time_from_filename(filename, pattern=r'^(\d{8})_(\d{6})'):
    """
    从文件名中提取时间信息
    
    参数:
        filename: 文件名
        pattern: 匹配时间的正则表达式，默认匹配YYYYMMDD_HHMMSS格式
    
    返回:
        如果成功提取时间，返回datetime对象；否则返回None
    """
    match = re.match(pattern, filename)
    if match:
        try:
            date_str = match.group(1)
            time_str = match.group(2)
            return datetime.strptime(f"{date_str}{time_str}", "%Y%m%d%H%M%S")
        except ValueError as e:
            logger.error(f"从文件名{filename}提取时间失败: {e}")
            return None
    return None

def modify_file_times(file_path, target_time):
    """
    修改文件的创建时间和更新时间
    
    参数:
        file_path: 文件路径
        target_time: 目标时间（datetime对象）
    
    返回:
        修改成功返回True，失败返回False
    """
    try:
        # 将datetime对象转换为时间戳
        timestamp = target_time.timestamp()
        
        # 修改文件的访问时间和修改时间
        os.utime(file_path, (timestamp, timestamp))
        
        # 尝试修改文件的创建时间（仅支持macOS）
        if sys.platform == 'darwin':  # macOS
            import subprocess
            # 使用SetFile命令修改文件创建时间
            subprocess.run([
                '/usr/bin/SetFile',
                '-d',
                target_time.strftime('%m/%d/%Y %H:%M:%S'),
                file_path
            ], check=True)
        
        logger.info(f"成功修改文件时间: {file_path} -> {target_time}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"修改文件{file_path}的创建时间失败: {e}")
        return False
    except Exception as e:
        logger.error(f"修改文件{file_path}的时间失败: {e}")
        return False

def move_to_untreated(file_path, untreated_dir):
    """
    将文件移动到未处理目录
    
    参数:
        file_path: 文件路径
        untreated_dir: 未处理目录路径
    
    返回:
        移动成功返回True，失败返回False
    """
    try:
        # 保持原文件名
        filename = os.path.basename(file_path)
        dest_path = os.path.join(untreated_dir, filename)
        
        # 检查文件名是否已存在
        counter = 1
        while os.path.exists(dest_path):
            name, ext = os.path.splitext(filename)
            dest_path = os.path.join(untreated_dir, f"{name}_{counter}{ext}")
            counter += 1
        
        # 如果文件不在未处理目录中，移动它
        if os.path.abspath(file_path) != os.path.abspath(dest_path):
            shutil.move(file_path, dest_path)
            logger.info(f"移动文件到未处理目录: {file_path} -> {dest_path}")
        return True
    except Exception as e:
        logger.error(f"移动文件{file_path}到未处理目录失败: {e}")
        return False

def batch_modify_file_times(input_dir, output_dir, pattern=r'^(\d{8})_(\d{6})'):
    """
    批量修改目录中文件的时间，并按照main.py相同的格式组织输出目录
    
    参数:
        input_dir: 要处理的输入目录路径
        output_dir: 输出目录路径
        pattern: 匹配时间的正则表达式
    
    返回:
        修改成功的文件数
    """
    success_count = 0
    error_count = 0
    
    # 创建与main.py相同的输出目录结构
    # 1. 创建当前时间戳的文件夹
    date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    date_dir = os.path.join(output_dir, date_str)
    os.makedirs(date_dir, exist_ok=True)
    
    # 2. 创建未处理文件夹
    untreated_dir = os.path.join(output_dir, 'untreated')
    os.makedirs(untreated_dir, exist_ok=True)
    
    # 遍历目录中的所有文件
    for filename in os.listdir(input_dir):
        file_path = os.path.join(input_dir, filename)
        
        # 只处理文件，不处理目录
        if os.path.isfile(file_path):
            # 从文件名中提取时间信息
            target_time = extract_time_from_filename(filename, pattern)
            
            if target_time:
                # 修改文件时间
                try:
                    # 创建目标文件路径（复制到时间戳文件夹）
                    target_file_path = os.path.join(date_dir, filename)
                    
                    # 检查文件名是否已存在，如果存在则添加计数器
                    if os.path.exists(target_file_path):
                        counter = 1
                        name, ext = os.path.splitext(filename)
                        while True:
                            new_filename = f"{name}_{counter}{ext}"
                            target_file_path = os.path.join(date_dir, new_filename)
                            if not os.path.exists(target_file_path):
                                break
                            counter += 1
                    
                    # 复制文件到目标目录
                    shutil.copy2(file_path, target_file_path)
                    
                    # 修改复制后文件的时间
                    if modify_file_times(target_file_path, target_time):
                        success_count += 1
                    else:
                        # 如果修改时间失败，将文件移动到未处理目录
                        move_to_untreated(target_file_path, untreated_dir)
                        error_count += 1
                except Exception as e:
                    logger.error(f"处理文件{file_path}失败: {e}")
                    error_count += 1
            else:
                logger.warning(f"无法从文件名中提取时间信息: {filename}")
                # 将无法处理的文件移动到未处理目录
                try:
                    # 创建目标文件路径（复制到未处理文件夹）
                    target_file_path = os.path.join(untreated_dir, filename)
                    
                    # 检查文件名是否已存在，如果存在则添加计数器
                    if os.path.exists(target_file_path):
                        counter = 1
                        name, ext = os.path.splitext(filename)
                        while True:
                            new_filename = f"{name}_{counter}{ext}"
                            target_file_path = os.path.join(untreated_dir, new_filename)
                            if not os.path.exists(target_file_path):
                                break
                            counter += 1
                    
                    # 复制文件到未处理目录
                    shutil.copy2(file_path, target_file_path)
                except Exception as e:
                    logger.error(f"将文件{file_path}移动到未处理目录失败: {e}")
                error_count += 1
    
    logger.info(f"批量处理完成: 成功{success_count}个, 失败{error_count}个")
    logger.info(f"处理后的文件保存在: {date_dir}")
    logger.info(f"未处理的文件保存在: {untreated_dir}")
    return success_count

def main():
    """
    主函数
    """
    parser = argparse.ArgumentParser(description='根据文件名称修改文件创建时间和更新时间')
    parser.add_argument('-i', '--input', help='输入目录路径（优先于配置文件）')
    parser.add_argument('-o', '--output', help='输出目录路径（优先于配置文件）')
    parser.add_argument('-p', '--pattern', default=r'^(\d{8})_(\d{6})', help='匹配时间的正则表达式')
    parser.add_argument('-v', '--verbose', action='store_true', help='显示详细日志信息')
    
    args = parser.parse_args()
    
    # 如果启用了详细日志，设置日志级别为DEBUG
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # 读取配置文件
    config = configparser.ConfigParser()
    config_file = os.path.join(os.path.dirname(__file__), 'config.ini')
    
    # 设置默认值
    default_input = './input'
    default_output = './output'
    
    # 如果配置文件存在，读取默认值
    if os.path.exists(config_file):
        config.read(config_file)
        if 'DEFAULT' in config:
            default_input = config['DEFAULT'].get('input', default_input)
            default_output = config['DEFAULT'].get('output', default_output)
    
    # 确定输入输出目录
    input_dir = args.input or default_input
    output_dir = args.output or default_output
    
    # 验证输入目录是否存在
    if not os.path.exists(input_dir):
        logger.error(f"输入目录不存在: {input_dir}")
        sys.exit(1)
    
    if not os.path.isdir(input_dir):
        logger.error(f"输入路径不是目录: {input_dir}")
        sys.exit(1)
    
    # 创建输出目录（如果不存在）
    os.makedirs(output_dir, exist_ok=True)
    
    logger.info(f"开始处理文件，输入目录: {input_dir}, 输出目录: {output_dir}")
    
    # 批量修改文件时间
    success_count = batch_modify_file_times(input_dir, output_dir, args.pattern)
    
    # 根据修改结果返回不同的退出码
    if success_count > 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()