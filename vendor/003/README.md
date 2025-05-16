# 多功能PDF转换器

这是一个基于Java开发的PDF文件转换工具，支持将PDF文件转换为图片、Word文档和OFD格式。

## 功能特点

- PDF转图片（支持JPEG、PNG、TIFF格式）
- PDF转Word文档
- PDF转OFD格式
- 批量转换支持
- 实时转换进度显示
- 友好的图形用户界面

## 系统要求

- Java Runtime Environment (JRE) 11或更高版本
- Windows操作系统

## 安装说明

1. 确保已安装JRE 11或更高版本
2. 下载发布包（PDF-Converter.zip）
3. 解压到任意目录
4. 双击运行start.bat或执行`java -jar pdf-converter.jar`

## 使用方法

1. 打开软件
2. 点击"打开文件"按钮或使用菜单"文件->打开"选择要转换的PDF文件
3. 选择转换方式：
   - 转换为图片：可设置输出格式、分辨率和颜色模式
   - 转换为Word：直接转换为DOCX格式
   - 转换为OFD：直接转换为OFD格式
4. 选择输出位置
5. 等待转换完成

## 注意事项

- 转换大文件时可能需要较长时间，请耐心等待
- 确保有足够的磁盘空间
- 建议关闭正在使用的PDF文件再进行转换

## 依赖库

- Apache PDFBox 2.0.27
- Apache POI 5.2.3
- OFD Reader & Writer 1.18.1
- Logback Classic 1.2.11

## 问题反馈

如遇到问题，请检查：
1. Java版本是否正确
2. PDF文件是否损坏
3. 是否有足够的系统权限和磁盘空间

## 开发者信息

本软件基于以下技术开发：
- Java Swing - 图形界面
- Apache PDFBox - PDF处理
- Apache POI - Word文档处理
- OFD Toolkit - OFD格式支持 