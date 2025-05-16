@echo off
chcp 65001
echo 正在清理旧的构建文件...
del /f /q target\PDF转换器.exe 2>nul

echo 正在编译项目...
call mvn clean package

echo 正在创建可执行文件...
"C:\Users\Administrator\Downloads\launch4j-3.50-win32\launch4j\launch4jc.exe" launch4j-config.xml

echo 打包完成！
echo 可执行文件位置：target\PDF转换器.exe
pause 