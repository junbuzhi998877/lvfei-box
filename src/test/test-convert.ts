import { OfdConverter } from '../services/OfdConverter';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  try {
    // 1. 创建测试目录
    const testDir = path.join(__dirname, '../../test');
    await fs.mkdir(testDir, { recursive: true });

    // 2. 创建一个简单的PDF文件用于测试
    const pdfPath = path.join(testDir, 'test.pdf');
    const ofdPath = path.join(testDir, 'test.ofd');

    // 3. 初始化转换器
    console.log('初始化转换器...');
    const converter = new OfdConverter();

    // 4. 读取PDF文件
    console.log('读取PDF文件...');
    const pdfBuffer = await fs.readFile(pdfPath);

    // 5. 检测是否为发票
    console.log('检测文件类型...');
    const isInvoice = await converter.detectInvoice(pdfBuffer);
    console.log(isInvoice ? '检测到发票格式' : '普通PDF文档');

    // 6. 转换为OFD
    console.log('开始转换...');
    const startTime = Date.now();
    const ofdBuffer = await converter.convertToOFD(pdfBuffer, {
      isInvoice,
      conformance: 'standard'
    });
    const endTime = Date.now();

    // 7. 保存OFD文件
    console.log('保存OFD文件...');
    await fs.writeFile(ofdPath, ofdBuffer);

    console.log('转换完成！');
    console.log(`输出文件: ${ofdPath}`);
    console.log(`转换用时: ${(endTime - startTime) / 1000} 秒`);
    console.log(`文件大小: ${(ofdBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

main(); 