const fs = require('fs');
const path = require('path');

// 要复制的模块列表
const modules = [
  'qrcode',
  'jimp',
  'pdf-lib',
  'pdf2json',
  'docx',
  'exceljs', 
  'pptxgenjs',
  'pdf2pic',
  'webp-converter',
  'jszip'
];

// 目标目录 - 构建后的应用程序资源目录 (asar.unpacked)
const targetDir = path.join(__dirname, 'release', 'win-unpacked', 'resources', 'app.asar.unpacked');

// 源目录 - 当前项目的node_modules
const sourceDir = path.join(__dirname, 'node_modules');

console.log('开始复制node_modules到构建目录...');

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`创建目标目录: ${targetDir}`);
  } catch (err) {
    console.error(`创建目标目录失败: ${err.message}`);
    process.exit(1);
  }
}

// 创建node_modules目录
const targetModulesDir = path.join(targetDir, 'node_modules');
if (!fs.existsSync(targetModulesDir)) {
  fs.mkdirSync(targetModulesDir, { recursive: true });
  console.log(`创建node_modules目录: ${targetModulesDir}`);
}

// 复制每个模块
modules.forEach(moduleName => {
  const moduleSourceDir = path.join(sourceDir, moduleName);
  const moduleTargetDir = path.join(targetModulesDir, moduleName);
  
  console.log(`复制模块: ${moduleName}`);
  
  if (!fs.existsSync(moduleSourceDir)) {
    console.error(`源模块不存在: ${moduleSourceDir}`);
    return;
  }
  
  // 递归复制目录
  copyRecursive(moduleSourceDir, moduleTargetDir);
});

console.log('复制完成!');

// 递归复制目录函数
function copyRecursive(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // 读取源目录内容
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // 复制每个条目
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    try {
      // 如果是目录，递归复制
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } 
      // 如果是文件，直接复制
      else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      console.error(`复制 ${srcPath} 到 ${destPath} 失败: ${err.message}`);
    }
  }
} 