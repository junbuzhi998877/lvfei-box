/**
 * 构建后修复脚本
 * 将需要的文件复制到正确的位置
 */

const fs = require('fs');
const path = require('path');

// 日志函数
function log(message) {
  console.log(message);
}

// 主函数
async function main() {
  log('开始执行构建后修复脚本...');

  try {
    // 基本路径
    const basePath = path.join(__dirname);
    const releasePath = path.join(basePath, 'release', 'win-unpacked');
    const resourcesPath = path.join(releasePath, 'resources');
    const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');
    
    // 确保unpacked目录存在
    if (!fs.existsSync(unpackedPath)) {
      fs.mkdirSync(unpackedPath, { recursive: true });
    }
    
    // 复制dist目录
    const distPath = path.join(unpackedPath, 'dist');
    if (!fs.existsSync(distPath)) {
      log(`创建dist目录: ${distPath}`);
      fs.mkdirSync(distPath, { recursive: true });
    }
    
    // 复制源dist目录到unpacked目录
    const srcDistPath = path.join(basePath, 'dist');
    log(`开始复制 ${srcDistPath} 到 ${distPath}`);
    copyFolderRecursive(srcDistPath, distPath);
    log('dist目录复制完成');
    
    // 复制JRE目录到unpacked目录
    const jrePath = path.join(unpackedPath, 'jre');
    if (!fs.existsSync(jrePath)) {
      log(`创建JRE目录: ${jrePath}`);
      fs.mkdirSync(jrePath, { recursive: true });
    }
    
    // 将resources/jre复制到app.asar.unpacked/jre
    const srcJrePath = path.join(resourcesPath, 'jre');
    if (fs.existsSync(srcJrePath)) {
      log(`开始复制JRE: ${srcJrePath} 到 ${jrePath}`);
      copyFolderRecursive(srcJrePath, jrePath);
      log('JRE目录复制完成');
    } else {
      log(`警告: 源JRE目录不存在: ${srcJrePath}`);
      
      // 尝试从项目根目录复制JRE
      const rootJrePath = path.join(basePath, 'jre');
      if (fs.existsSync(rootJrePath)) {
        log(`尝试从项目根目录复制JRE: ${rootJrePath} 到 ${jrePath}`);
        copyFolderRecursive(rootJrePath, jrePath);
        log('从项目根目录复制JRE完成');
      } else {
        log(`错误: 找不到JRE目录: ${rootJrePath}`);
      }
    }
    
    // 复制vendor目录到unpacked目录
    const vendorPath = path.join(unpackedPath, 'vendor');
    if (!fs.existsSync(vendorPath)) {
      log(`创建vendor目录: ${vendorPath}`);
      fs.mkdirSync(vendorPath, { recursive: true });
    }
    
    // 将resources/vendor复制到app.asar.unpacked/vendor
    const srcVendorPath = path.join(resourcesPath, 'vendor');
    if (fs.existsSync(srcVendorPath)) {
      log(`开始复制vendor: ${srcVendorPath} 到 ${vendorPath}`);
      copyFolderRecursive(srcVendorPath, vendorPath);
      log('vendor目录复制完成');
    } else {
      log(`警告: 源vendor目录不存在: ${srcVendorPath}`);
      
      // 尝试从项目根目录复制vendor
      const rootVendorPath = path.join(basePath, 'vendor');
      if (fs.existsSync(rootVendorPath)) {
        log(`尝试从项目根目录复制vendor: ${rootVendorPath} 到 ${vendorPath}`);
        copyFolderRecursive(rootVendorPath, vendorPath);
        log('从项目根目录复制vendor完成');
      } else {
        log(`错误: 找不到vendor目录: ${rootVendorPath}`);
      }
    }
    
    // 复制main.js到unpacked目录
    const mainJsPath = path.join(basePath, 'main.js');
    const destMainJsPath = path.join(unpackedPath, 'main.js');
    
    log(`从 ${mainJsPath} 读取main.js内容`);
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    
    log(`main.js复制到 ${destMainJsPath}`);
    fs.writeFileSync(destMainJsPath, mainJsContent);
    
    log('构建后修复脚本执行完成');
  } catch (error) {
    log(`构建后修复脚本出错: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
}

// 递归复制文件夹
function copyFolderRecursive(src, dest) {
  // 读取源目录内容
  const items = fs.readdirSync(src);
  
  // 处理每个项目
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    // 检查是文件还是目录
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      // 如果是目录，创建目标目录并递归复制
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyFolderRecursive(srcPath, destPath);
    } else {
      // 如果是文件，直接复制
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 执行主函数
main().catch(error => {
  log(`致命错误: ${error.message}`);
  log(error.stack);
  process.exit(1);
}); 