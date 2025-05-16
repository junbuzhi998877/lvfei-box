@echo off
chcp 65001
echo 正在清理旧的构建文件...
rmdir /s /q target\package 2>nul
rmdir /s /q target\installer 2>nul

echo 正在编译项目...
call mvn clean package

echo 正在准备打包文件...
mkdir target\package
copy target\pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar target\package\pdf-converter.jar

echo 正在创建安装程序...
jpackage --type exe --name "PDF转换器" --input target\package --main-jar pdf-converter.jar --main-class com.pdfconverter.ui.MainFrame --icon src\main\resources\icons\app.ico --app-version 1.0.0 --vendor "PDF Converter" --copyright "Copyright © 2024" --description "PDF文件格式转换工具，支持PDF转Word、OFD等格式" --dest target\installer --win-dir-chooser --win-menu --win-shortcut --win-per-user-install --java-options "-Xms256m" --java-options "-Xmx1024m" --java-options "-Dfile.encoding=UTF-8" --win-shortcut-prompt --win-menu-group "PDF工具" --resource-dir src\main\resources

echo 打包完成！
echo 安装程序位置：target\installer\PDF转换器-1.0.0.exe
pause 