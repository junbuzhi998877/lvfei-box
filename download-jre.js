/**
 * 下载JRE脚本
 * 此脚本用于在构建之前下载和配置JRE
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const url = require('url');
const { createUnzip } = require('zlib');
const { Extract } = require('unzip-stream'); // 使用unzip-stream库进行解压

// 配置
const JRE_VERSION = '17.0.10+13'; // 更新为JDK 17 LTS版本
const ADOPTIUM_BASE_URL = 'https://api.adoptium.net/v3/assets/latest/17/hotspot'; // 更新为Java 17版本的API路径
const JRE_DIR = path.join(__dirname, 'jre');
const TEMP_DIR = path.join(__dirname, 'temp');
const LOG_FILE = path.join(__dirname, 'jre-download.log');

// 日志记录函数
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// 确保目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  logMessage(`创建临时目录: ${TEMP_DIR}`);
}

// 根据操作系统选择合适的JRE版本
function getJREUrl() {
  const platform = process.platform;
  const arch = process.arch;
  let os_name;
  let pkg_type = 'jre';
  
  switch (platform) {
    case 'win32':
      os_name = 'windows';
      break;
    case 'darwin':
      os_name = 'mac';
      break;
    case 'linux':
      os_name = 'linux';
      break;
    default:
      throw new Error(`不支持的操作系统: ${platform}`);
  }
  
  let arch_name;
  switch (arch) {
    case 'x64':
      arch_name = 'x64';
      break;
    case 'ia32':
      arch_name = 'x86';
      break;
    case 'arm64':
      arch_name = 'aarch64';
      break;
    default:
      throw new Error(`不支持的架构: ${arch}`);
  }
  
  // 构建URL - 使用新的API格式
  const url = `${ADOPTIUM_BASE_URL}?architecture=${arch_name}&image_type=${pkg_type}&os=${os_name}&vendor=eclipse`;
  
  logMessage(`为 ${os_name}-${arch_name} 构建JRE下载URL: ${url}`);
  return url;
}

// 请求文件，支持重定向
function requestWithRedirects(requestUrl, file, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(requestUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const requester = isHttps ? https : http;
    
    logMessage(`请求URL: ${requestUrl} (${isHttps ? 'HTTPS' : 'HTTP'})`);
    
    const req = requester.get(requestUrl, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        if (maxRedirects === 0) {
          return reject(new Error('超过最大重定向次数'));
        }
        
        const location = response.headers.location;
        logMessage(`收到重定向 (${response.statusCode}) 到: ${location}`);
        
        // 关闭当前请求
        response.destroy();
        
        // 递归处理重定向
        requestWithRedirects(location, file, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // 处理其他状态码
      if (response.statusCode !== 200) {
        return reject(new Error(`下载失败，状态码: ${response.statusCode}`));
      }
      
      // 下载文件
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        logMessage('JRE下载完成.');
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(file.path, () => {});
        reject(err);
      });
    });
    
    req.on('error', (err) => {
      fs.unlink(file.path, () => {});
      reject(err);
    });
    
    req.end();
  });
}

// 使用unzip-stream解压文件
function extractZip(zipFile, targetDir) {
  return new Promise((resolve, reject) => {
    logMessage(`解压文件: ${zipFile} 到 ${targetDir}`);
    
    // 创建解压流
    const unzipStream = Extract({ path: targetDir });
    const readStream = fs.createReadStream(zipFile);
    
    // 处理解压事件
    unzipStream.on('close', () => {
      logMessage('解压完成');
      resolve();
    });
    
    unzipStream.on('error', (err) => {
      logMessage(`解压错误: ${err.message}`);
      reject(err);
    });
    
    // 开始解压
    readStream.pipe(unzipStream);
  });
}

// 下载JRE
async function downloadJRE() {
  logMessage('开始下载JRE...');
  
  // 检查JRE是否已存在且有效
  if (fs.existsSync(JRE_DIR) && validateJRE(JRE_DIR)) {
    logMessage('有效的JRE目录已存在，跳过下载.');
    return;
  } else if (fs.existsSync(JRE_DIR)) {
    logMessage('JRE目录存在但无效，需要重新下载.');
    // 清理无效的JRE目录
    try {
      fs.rmSync(JRE_DIR, { recursive: true, force: true });
      logMessage('已删除无效的JRE目录.');
    } catch (rmError) {
      logMessage(`删除无效JRE目录失败: ${rmError.message}`);
      // 继续尝试重新下载
    }
  }
  
  // 确保JRE目录存在
  if (!fs.existsSync(JRE_DIR)) {
    fs.mkdirSync(JRE_DIR, { recursive: true });
    logMessage(`创建JRE目录: ${JRE_DIR}`);
  }
  
  // 构建URL
  try {
    const url = getJREUrl();
    const jreFilePath = path.join(TEMP_DIR, 'jre.zip');
    
    // 获取下载链接
    const downloadUrl = await getActualDownloadUrl(url);
    logMessage(`从 ${downloadUrl} 下载JRE...`);
    
    // 下载JRE
    const file = fs.createWriteStream(jreFilePath);
    await requestWithRedirects(downloadUrl, file);
    
    // 解压JRE
    logMessage('正在解压JRE...');
    try {
      await extractZip(jreFilePath, TEMP_DIR);
    } catch (extractError) {
      logMessage(`解压JRE失败: ${extractError.message}`);
      throw extractError;
    }
    
    // 移动JRE到最终位置
    logMessage('正在配置JRE...');
    const extractedDirs = fs.readdirSync(TEMP_DIR).filter(
      dir => dir !== 'jre.zip' && fs.statSync(path.join(TEMP_DIR, dir)).isDirectory()
    );
    
    if (extractedDirs.length === 0) {
      throw new Error('没有找到解压后的JRE目录');
    }
    
    // 寻找JRE目录
    let jreDirFound = false;
    let extractedJreDir = '';
    
    for (const dir of extractedDirs) {
      const fullPath = path.join(TEMP_DIR, dir);
      // 检查是否包含bin目录和java可执行文件
      const binDir = path.join(fullPath, 'bin');
      const javaExe = path.join(binDir, process.platform === 'win32' ? 'java.exe' : 'java');
      
      if (fs.existsSync(binDir) && fs.existsSync(javaExe)) {
        extractedJreDir = fullPath;
        jreDirFound = true;
        break;
      }
      
      // 检查一级子目录
      if (!jreDirFound && fs.statSync(fullPath).isDirectory()) {
        const subDirs = fs.readdirSync(fullPath).filter(
          subDir => fs.statSync(path.join(fullPath, subDir)).isDirectory()
        );
        
        for (const subDir of subDirs) {
          const subPath = path.join(fullPath, subDir);
          const subBinDir = path.join(subPath, 'bin');
          const subJavaExe = path.join(subBinDir, process.platform === 'win32' ? 'java.exe' : 'java');
          
          if (fs.existsSync(subBinDir) && fs.existsSync(subJavaExe)) {
            extractedJreDir = subPath;
            jreDirFound = true;
            break;
          }
        }
      }
      
      if (jreDirFound) break;
    }
    
    if (!jreDirFound) {
      logMessage('未找到有效的JRE目录，将使用第一个解压目录');
      extractedJreDir = path.join(TEMP_DIR, extractedDirs[0]);
    }
    
    logMessage(`使用JRE目录: ${extractedJreDir}`);
    
    // 复制提取的JRE文件
    copyFolderRecursiveSync(extractedJreDir, JRE_DIR);
    
    logMessage('JRE配置完成.');
    
    // 清理临时文件
    try {
      fs.rmSync(jreFilePath, { force: true });
      logMessage('清理临时文件完成.');
    } catch (cleanupError) {
      logMessage(`清理临时文件失败: ${cleanupError.message}`);
      // 继续执行，不中断流程
    }
    
  } catch (error) {
    logMessage(`下载或配置JRE时出错: ${error.message}`);
    throw error;
  }
}

// 获取实际的下载URL
async function getActualDownloadUrl(apiUrl) {
  return new Promise((resolve, reject) => {
    https.get(apiUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`API请求失败，状态码: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const releases = JSON.parse(data);
          if (!releases || !releases.length) {
            reject(new Error('无法从API获取有效的JRE下载信息'));
            return;
          }
          
          // 获取第一个下载链接
          const downloadUrl = releases[0].binary.package.link;
          if (!downloadUrl) {
            reject(new Error('无法找到JRE下载链接'));
            return;
          }
          
          resolve(downloadUrl);
        } catch (err) {
          reject(new Error(`解析API响应失败: ${err.message}`));
        }
      });
      
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 手动下载JRE函数（备用方案）
async function manuallyDownloadJRE() {
  logMessage('尝试使用备用下载链接...');
  
  // 备用下载链接 (直接使用Adoptium编译好的JRE)
  const backupUrl = {
    'win32-x64': 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse',
    'darwin-x64': 'https://api.adoptium.net/v3/binary/latest/17/ga/mac/x64/jre/hotspot/normal/eclipse',
    'darwin-arm64': 'https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jre/hotspot/normal/eclipse',
    'linux-x64': 'https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jre/hotspot/normal/eclipse'
  };
  
  // 第二备用下载链接 (使用镜像链接)
  const mirrorUrl = {
    'win32-x64': 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/windows/OpenJDK17U-jre_x64_windows_hotspot_17.0.10_13.zip',
    'darwin-x64': 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/mac/OpenJDK17U-jre_x64_mac_hotspot_17.0.10_13.tar.gz',
    'darwin-arm64': 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/aarch64/mac/OpenJDK17U-jre_aarch64_mac_hotspot_17.0.10_13.tar.gz',
    'linux-x64': 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/linux/OpenJDK17U-jre_x64_linux_hotspot_17.0.10_13.tar.gz'
  };
  
  const key = `${process.platform}-${process.arch}`;
  let downloadUrl = backupUrl[key];
  
  if (!downloadUrl) {
    throw new Error(`没有适用于 ${key} 的备用下载链接`);
  }
  
  logMessage(`使用备用链接: ${downloadUrl}`);
  const jreFilePath = path.join(TEMP_DIR, 'jre.zip');
  
  try {
    // 尝试下载JRE
    const file = fs.createWriteStream(jreFilePath);
    await requestWithRedirects(downloadUrl, file);
  } catch (error) {
    // 如果第一个备用链接失败，尝试第二个镜像链接
    logMessage(`备用链接下载失败: ${error.message}`);
    logMessage('尝试使用镜像链接...');
    
    downloadUrl = mirrorUrl[key];
    if (!downloadUrl) {
      throw new Error(`没有适用于 ${key} 的镜像下载链接`);
    }
    
    logMessage(`使用镜像链接: ${downloadUrl}`);
    const file = fs.createWriteStream(jreFilePath);
    await requestWithRedirects(downloadUrl, file);
  }
  
  // 解压文件
  logMessage('正在解压JRE...');
  try {
    await extractZip(jreFilePath, TEMP_DIR);
  } catch (extractError) {
    logMessage(`备用方法解压JRE失败: ${extractError.message}`);
    throw extractError;
  }
  
  // 剩余流程与主方法相同 - 将在调用方处理
  return jreFilePath;
}

// 递归复制文件夹
function copyFolderRecursiveSync(source, target) {
  const files = fs.readdirSync(source);
  
  logMessage(`复制目录: ${source} -> ${target}`);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      // 创建目录
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      // 递归复制子目录
      copyFolderRecursiveSync(sourcePath, targetPath);
    } else {
      // 复制文件
      try {
        fs.copyFileSync(sourcePath, targetPath);
      } catch (copyError) {
        logMessage(`复制文件失败 ${sourcePath}: ${copyError.message}`);
      }
    }
  });
}

// 验证JRE是否有效
function validateJRE(jrePath) {
  // 检查bin目录和java可执行文件
  const binDir = path.join(jrePath, 'bin');
  const javaExe = path.join(binDir, process.platform === 'win32' ? 'java.exe' : 'java');
  
  if (!fs.existsSync(binDir)) {
    logMessage(`验证失败: bin目录不存在 (${binDir})`);
    return false;
  }
  
  if (!fs.existsSync(javaExe)) {
    logMessage(`验证失败: java可执行文件不存在 (${javaExe})`);
    return false;
  }
  
  logMessage(`JRE验证成功: ${jrePath}`);
  return true;
}

// 安装unzip-stream依赖
function installUnzipDependency() {
  return new Promise((resolve, reject) => {
    logMessage('正在安装unzip-stream依赖...');
    exec('npm install unzip-stream --no-save', (error, stdout, stderr) => {
      if (error) {
        logMessage(`安装依赖失败: ${error.message}`);
        reject(error);
        return;
      }
      logMessage('unzip-stream依赖安装成功');
      resolve();
    });
  });
}

// 主函数
async function main() {
  // 清除旧日志
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, ''); // 清空日志文件
  }
  
  logMessage('===== JRE下载脚本开始 =====');
  logMessage(`系统信息: ${process.platform} (${process.arch})`);
  
  try {
    // 确保temp目录存在
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
      logMessage(`创建临时目录: ${TEMP_DIR}`);
    }
    
    // 安装依赖
    try {
      // 先看看能不能导入，不能再安装
      require('unzip-stream');
    } catch (err) {
      await installUnzipDependency();
    }
    
    await downloadJRE();
    
    // 验证JRE
    if (fs.existsSync(JRE_DIR)) {
      const isValid = validateJRE(JRE_DIR);
      if (isValid) {
        logMessage('JRE准备完成.');
      } else {
        throw new Error('JRE验证失败');
      }
    } else {
      throw new Error('JRE目录不存在');
    }
  } catch (error) {
    logMessage(`主方法下载JRE失败: ${error.message}`);
    
    try {
      // 删除可能存在的无效JRE目录
      if (fs.existsSync(JRE_DIR)) {
        try {
          fs.rmSync(JRE_DIR, { recursive: true, force: true });
          logMessage('已删除无效的JRE目录.');
        } catch (rmError) {
          logMessage(`删除无效JRE目录失败: ${rmError.message}`);
        }
      }
      
      // 确保JRE目录存在
      if (!fs.existsSync(JRE_DIR)) {
        fs.mkdirSync(JRE_DIR, { recursive: true });
        logMessage(`创建JRE目录: ${JRE_DIR}`);
      }
      
      // 尝试备用下载方法
      await manuallyDownloadJRE();
      
      // 获取解压后的JRE目录
      const extractedDirs = fs.readdirSync(TEMP_DIR).filter(
        dir => dir !== 'jre.zip' && fs.statSync(path.join(TEMP_DIR, dir)).isDirectory()
      );
      
      if (extractedDirs.length === 0) {
        throw new Error('没有找到解压后的JRE目录');
      }
      
      // 查找包含java可执行文件的目录
      let jreDirFound = false;
      let extractedJreDir = '';
      
      for (const dir of extractedDirs) {
        const fullPath = path.join(TEMP_DIR, dir);
        // 检查是否包含bin目录和java可执行文件
        if (validateJRE(fullPath)) {
          extractedJreDir = fullPath;
          jreDirFound = true;
          break;
        }
        
        // 检查一级子目录
        if (!jreDirFound && fs.statSync(fullPath).isDirectory()) {
          const subDirs = fs.readdirSync(fullPath).filter(
            subDir => fs.statSync(path.join(fullPath, subDir)).isDirectory()
          );
          
          for (const subDir of subDirs) {
            const subPath = path.join(fullPath, subDir);
            if (validateJRE(subPath)) {
              extractedJreDir = subPath;
              jreDirFound = true;
              break;
            }
          }
        }
        
        if (jreDirFound) break;
      }
      
      if (!jreDirFound) {
        throw new Error('未找到有效的JRE目录');
      }
      
      // 创建JRE目录
      if (!fs.existsSync(JRE_DIR)) {
        fs.mkdirSync(JRE_DIR, { recursive: true });
      }
      
      // 复制提取的JRE文件
      copyFolderRecursiveSync(extractedJreDir, JRE_DIR);
      
      logMessage('JRE备用方案安装完成.');
      
      // 验证最终安装
      const isValid = validateJRE(JRE_DIR);
      if (isValid) {
        logMessage('使用备用方法下载JRE成功.');
      } else {
        throw new Error('JRE备用安装验证失败');
      }
    } catch (backupError) {
      logMessage(`所有下载方法均失败: ${backupError.message}`);
      process.exit(1);
    }
  }
  
  logMessage('===== JRE下载脚本完成 =====');
}

// 执行主函数
main().catch(error => {
  logMessage(`致命错误: ${error.message}`);
  logMessage(error.stack);
  process.exit(1);
}); 