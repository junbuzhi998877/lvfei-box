# 多功能工具箱应用 - 带内置JRE构建指南

本文档说明如何构建包含内置JRE的工具箱应用，以支持无需用户手动安装Java环境的PDF转OFD功能。

## 准备工作

### 环境要求

- Node.js >= 16.x
- npm >= 8.x
- 互联网连接（用于下载JRE）
- 足够的磁盘空间（JRE约需200MB）

### 必需文件

PDF转OFD功能需要以下文件：

1. **Java PDF转OFD程序**
   - 文件名: `pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`
   - 必须位于: `vendor/003/target/` 目录下
   
   如果此文件不存在，应用将无法执行PDF转OFD功能。请确保该文件存在并且正确放置。

2. **Java运行环境(JRE)**
   - 位于: `jre/` 目录 (将由download-jre.js脚本自动下载)
   - 要求版本: Java 21（以支持PDF转OFD Java程序）

## 构建步骤

1. **安装依赖**

   ```bash
   npm install
   ```

2. **安装解压依赖**

   ```bash
   npm install unzip-stream --save-dev
   ```

   此依赖用于JRE下载脚本中解压ZIP文件。

3. **确认Java PDF转OFD程序**

   确保`vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`文件存在。
   
   如果缺少此文件，您需要先构建或获取它，并将其放置在正确的位置。

4. **下载JRE**

   自动下载并配置JRE（JRE 21）:
   
   ```bash
   npm run download-jre
   ```
   
   此命令会:
   - 根据您的操作系统自动下载合适的JRE版本
   - 解压JRE并配置到项目的`jre`目录
   - 为打包做好准备

5. **构建应用**

   ```bash
   npm run build:electron
   ```
   
   此命令会:
   - 自动运行`download-jre`脚本（如果尚未运行）
   - 构建React应用
   - 使用electron-builder打包应用
   - 在打包中包含JRE和Java PDF转换程序

6. **构建结果**

   构建完成后，可执行文件将位于`release`目录中。

## 开发环境使用说明

在开发环境中，可以通过以下方式使用PDF转OFD功能：

1. **无需下载JRE**：开发环境下，应用会直接使用系统安装的Java来运行PDF转OFD转换程序。

2. **运行应用**：
   ```bash
   npm run dev:react
   ```

3. **使用功能**：在应用的PDF工具中选择"转换为OFD"选项即可启动外部Java程序。

4. **排查问题**：
   - 确保系统已安装Java，可通过运行`java -version`命令验证
   - 检查Java程序路径是否正确，路径通常为`vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`
   - 当点击OFD选项没反应时，可以检查应用日志，查看具体错误信息

## 生产环境部署说明

分发应用程序给用户时，需要确保以下几点：

1. **包含内置JRE**：确保应用程序包含了内置的JRE，这样用户无需安装Java环境。

2. **包含PDF转OFD转换程序**：确保`vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`也被打包到应用中。

3. **JRE位置**：应用程序现在同时支持两个JRE位置:
   - `resources/jre` - 主要JRE位置
   - `resources/app.asar.unpacked/jre` - 备用JRE位置（通过postbuild-fix.js自动复制）

4. **Java程序位置**：Java PDF转OFD程序支持以下位置：
   - `resources/vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar` - 主要位置
   - `resources/app.asar.unpacked/vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar` - 备用位置
   - 系统默认Java可以访问的任何位置（开发环境）

## 部署后的验证步骤

在将构建好的应用分发给用户前，请执行以下验证步骤：

1. **检查JRE目录**：
   - 确认`release/win-unpacked/resources/jre`目录存在且包含完整的JRE文件
   - 确认`release/win-unpacked/resources/app.asar.unpacked/jre`目录存在且包含完整的JRE文件
   - 验证`release/win-unpacked/resources/app.asar.unpacked/jre/bin/java.exe`文件存在（Windows平台）

2. **验证Java程序**：
   确认以下路径中至少有一个存在：
   - `release/win-unpacked/resources/vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`
   - `release/win-unpacked/resources/app.asar.unpacked/vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`

3. **测试功能**：在打包后的应用中测试PDF转OFD功能，确保它能正常工作

## 常见问题排查

### OFD转换功能不工作

如果在生产环境中点击PDF转OFD功能没有反应，可能是以下原因：

1. **缺少JAR文件**：
   - 确保Java PDF转OFD程序JAR文件存在于vendor/003/target/目录下
   - 如果缺少此文件，应用将无法启动Java程序

2. **内置JRE路径问题**：
   - 应用程序现在会按以下顺序查找JRE:
     1. `resources/jre` 目录
     2. `resources/app.asar.unpacked/jre` 目录
     3. 系统安装的Java
   - 确保至少一个路径存在且包含有效的JRE

3. **Java版本不兼容**：
   - PDF转OFD程序可能需要更高版本的Java
   - 确保使用的JRE版本与Java程序兼容（推荐Java 21）

4. **权限问题**：
   - 确保应用程序有足够的权限执行Java程序
   - 尝试以管理员权限运行应用程序

### 解决方案

如果遇到以上问题，可以通过以下方式解决：

1. **重新构建应用程序**：
   ```bash
   npm run clean  # 清理旧的构建文件
   npm run download-jre  # 重新下载JRE
   npm run build:electron  # 重新构建应用
   ```

2. **手动验证JRE与Java程序**：
   在构建完成后，验证以下路径中的文件是否存在：
   ```
   release/win-unpacked/resources/jre/bin/java.exe  # 主要JRE
   release/win-unpacked/resources/app.asar.unpacked/jre/bin/java.exe  # 备用JRE
   release/win-unpacked/resources/vendor/003/target/pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar
   ```

3. **手动测试Java程序**：
   使用内置JRE手动运行Java程序，确认它可以正常工作：
   ```
   .\release\win-unpacked\resources\jre\bin\java.exe -jar .\release\win-unpacked\resources\vendor\003\target\pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar
   ```

4. **查看应用日志**：
   应用现在会记录详细的日志信息，可以帮助诊断问题。日志文件位于用户数据目录下的logs文件夹中。

## 注意事项

- **安装包大小**: 由于包含了JRE，安装包大小将增加约200MB。
- **兼容性**: 内置JRE设计为支持Windows、macOS和Linux。
- **容错机制**: 应用程序具有多重容错机制，当主要JRE路径不可用时，会尝试备用路径，最后才使用系统Java。
- **资源路径**: 在生产环境中，应用会从资源目录加载JRE和Java程序。
- **JAR文件要求**: 必须确保`pdf-converter-1.0-SNAPSHOT-jar-with-dependencies.jar`文件存在于正确位置。

## JRE下载问题解决方案

如果执行`npm run download-jre`时遇到问题：

1. **HTTP 302错误或下载失败**
   - 该脚本已包含自动重定向处理和备用下载链接
   - 如果仍然失败，可以手动下载JRE，放置在项目根目录的`jre`文件夹中

2. **解压错误**
   - 确保已安装`unzip-stream`依赖：`npm install unzip-stream --save-dev`
   - 如果Windows上出现"powershell不是内部或外部命令"错误，新版脚本已修复此问题

3. **手动下载JRE**
   - 访问[Eclipse Adoptium](https://adoptium.net/temurin/releases/?version=21)
   - 下载JRE 21版本（Windows/Mac/Linux对应版本）
   - 解压到项目根目录的`jre`文件夹
   - 确保`jre/bin/java`（Linux/Mac）或`jre\bin\java.exe`（Windows）存在

4. **查看详细日志**
   - 下载过程中的详细日志会记录在项目根目录的`jre-download.log`文件中
   - 检查此日志可以找到具体的错误原因

## 故障排除

如果遇到构建问题：

1. **JRE下载失败**
   - 检查您的网络连接
   - 尝试手动下载JRE并放置在`jre`目录
   - 当前版本使用Adoptium API获取JRE，API变更可能导致下载失败
   - 查看`jre-download.log`日志文件获取详细错误信息

2. **JRE不兼容**
   - 确保下载的是与您操作系统匹配的JRE版本
   - 如需手动下载，请访问[Eclipse Adoptium](https://adoptium.net/temurin/releases/?version=21)

3. **打包错误**
   - 检查`package.json`中的`build.extraResources`和`build.asarUnpack`配置
   - 确保`jre`和`vendor/003/target`目录存在且包含所需文件

4. **Java程序启动失败**
   - 检查Java程序路径是否正确
   - 尝试手动运行JAR文件验证其功能：`java -jar path/to/pdf-converter-jar-with-dependencies.jar`
   - 确保有足够的系统权限运行Java程序

## 发布注意事项

发布应用时，请确保：

1. 在应用说明中说明应用已包含运行所需的所有组件，用户无需安装Java
2. 提供足够的系统要求信息（如操作系统版本）
3. 如果您修改了JRE版本，请在文档中更新对应信息

---

本构建方案设计为开箱即用，让您的用户无需担心Java环境配置，即可使用PDF转OFD功能。 